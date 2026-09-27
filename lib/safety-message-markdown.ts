const TOKEN = /(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\(https:\/\/[^)\s]+\))/g

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function inlineHtml(text: string) {
  return text.split(TOKEN).map((part) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return `<strong>${escapeHtml(part.slice(2, -2))}</strong>`
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2 && !part.startsWith('**')) {
      return `<em>${escapeHtml(part.slice(1, -1))}</em>`
    }
    const link = part.match(/^\[([^\]]+)\]\((https:\/\/[^)\s]+)\)$/)
    if (link) return `<a href="${escapeHtml(link[2])}">${escapeHtml(link[1])}</a>`
    return escapeHtml(part)
  }).join('')
}

function procedureLabel(line: string) {
  const match = line.match(/^\*\*([^*]+)\*\*$/)
  if (!match) return null
  const text = match[1].trim()
  if (text.length > 48 || /[.?!]/.test(text)) return null
  return text
}

/** HTML for the editor surface. Bold, headings, and lists are real formatting, not asterisks. */
export function markdownToHtml(markdown: string) {
  const blocks = markdown.trim().split(/\n\n+/)
  const html = blocks.map((block) => {
    const lines = block.split('\n').map((line) => line.trim()).filter(Boolean)
    if (lines.length === 0) return ''

    const heading = lines.length === 1 ? lines[0].match(/^#{2,3}\s+(.+)$/) : null
    if (heading) return `<h3>${inlineHtml(heading[1])}</h3>`

    const label = lines.length === 1 ? procedureLabel(lines[0]) : null
    if (label) return `<h3 class="article-label">${escapeHtml(label)}</h3>`

    if (lines.length === 1 && /^\*\*[^*]+\*\*$/.test(lines[0])) {
      return `<aside class="article-callout"><p>${inlineHtml(lines[0])}</p></aside>`
    }

    if (lines.every((line) => line.startsWith('>'))) {
      const text = lines.map((line) => line.replace(/^>\s?/, '')).join(' ')
      return `<blockquote><p>${inlineHtml(text)}</p></blockquote>`
    }

    const isList = lines.every((line) => line.startsWith('- '))
    const isOrdered = lines.every((line) => /^\d+\.\s/.test(line))
    if (isList || isOrdered) {
      const tag = isOrdered ? 'ol' : 'ul'
      const items = lines.map((line) => `<li>${inlineHtml(line.replace(/^(?:- |\d+\.\s)/, ''))}</li>`).join('')
      return `<${tag}>${items}</${tag}>`
    }

    return `<p>${inlineHtml(lines.join(' '))}</p>`
  }).filter(Boolean)

  return html.join('')
}

function inlineToMarkdown(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return (node.textContent ?? '').replace(/\u00a0/g, ' ')
  if (!(node instanceof HTMLElement)) return ''
  if (node.tagName === 'BR') return ' '

  const children = Array.from(node.childNodes).map(inlineToMarkdown).join('')
  const tag = node.tagName
  if ((tag === 'STRONG' || tag === 'B') && children.trim()) return `**${children}**`
  if ((tag === 'EM' || tag === 'I') && children.trim()) return `*${children}*`
  if (tag === 'A') {
    const href = node.getAttribute('href') ?? ''
    if (/^https:\/\/\S+$/.test(href) && children.trim()) return `[${children}](${href})`
    return children
  }
  const weight = node.style.fontWeight
  if ((weight === 'bold' || Number(weight) >= 600) && children.trim()) return `**${children}**`
  if (node.style.fontStyle === 'italic' && children.trim()) return `*${children}*`
  return children
}

function plain(node: Node) {
  return inlineToMarkdown(node).replace(/\s+/g, ' ').trim()
}

function listToMarkdown(list: HTMLElement) {
  const ordered = list.tagName === 'OL'
  const lines: string[] = []
  let index = 1
  for (const child of Array.from(list.children)) {
    if (!(child instanceof HTMLElement) || child.tagName !== 'LI') continue
    const nested = Array.from(child.children).filter((el) => el.tagName === 'UL' || el.tagName === 'OL')
    const copy = child.cloneNode(true) as HTMLElement
    copy.querySelectorAll('ul, ol').forEach((el) => el.remove())
    const text = plain(copy)
    if (text) {
      lines.push(ordered ? `${index}. ${text}` : `- ${text}`)
      index += 1
    }
    for (const sub of nested) {
      if (sub instanceof HTMLElement) {
        const nestedText = listToMarkdown(sub)
        if (nestedText) lines.push(nestedText)
      }
    }
  }
  return lines.join('\n')
}

function blocksFrom(node: Node): string[] {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = (node.textContent ?? '').replace(/\u00a0/g, ' ').trim()
    return text ? [text] : []
  }
  if (!(node instanceof HTMLElement)) return []

  const tag = node.tagName
  if (tag === 'UL' || tag === 'OL') {
    const text = listToMarkdown(node)
    return text ? [text] : []
  }
  if (tag === 'BLOCKQUOTE') {
    const text = plain(node)
    return text ? [`> ${text}`] : []
  }
  if (tag === 'H1' || tag === 'H2' || tag === 'H3' || tag === 'H4') {
    const text = plain(node)
    if (!text) return []
    if (node.classList.contains('article-label')) return [`**${text}**`]
    return [`### ${text}`]
  }
  if (tag === 'ASIDE') {
    const text = plain(node)
    return text ? [text] : []
  }
  if (tag === 'DIV') {
    const nested = Array.from(node.children).filter((child) => /^(P|DIV|H\d|UL|OL|BLOCKQUOTE|ASIDE)$/.test(child.tagName))
    if (nested.length > 0) return nested.flatMap((child) => blocksFrom(child))
  }

  const text = plain(node)
  return text ? [text] : []
}

/** Turns the formatted editor back into the markdown stored on the message. */
export function htmlToMarkdown(root: HTMLElement) {
  return Array.from(root.childNodes).flatMap((node) => blocksFrom(node)).join('\n\n').trim()
}
