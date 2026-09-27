const TOKEN = /(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\(https:\/\/[^)\s]+\))/g

function renderInline(text: string) {
  return text.split(TOKEN).map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return <strong key={index}>{part.slice(2, -2)}</strong>
    }

    if (part.startsWith('*') && part.endsWith('*') && part.length > 2 && !part.startsWith('**')) {
      return <em key={index}>{part.slice(1, -1)}</em>
    }

    const link = part.match(/^\[([^\]]+)\]\((https:\/\/[^)\s]+)\)$/)
    if (link) {
      return (
        <a key={index} href={link[2]} target="_blank" rel="noopener noreferrer">
          {link[1]}
        </a>
      )
    }

    return part
  })
}

/** Further reading is rendered once, from the message links, below the article. */
function articleSource(markdown: string) {
  return markdown.replace(/\n+\*\*Further reading:\*\*[\s\S]*$/i, '').trim()
}

function procedureLabel(line: string) {
  const match = line.match(/^\*\*([^*]+)\*\*$/)
  if (!match) return null
  const text = match[1].trim()
  if (text.length > 48 || /[.?!]/.test(text)) return null
  return text
}

export function MessageBody({ markdown }: { markdown: string }) {
  const blocks = articleSource(markdown).split(/\n\n+/)

  return (
    <>
      {blocks.map((block, index) => {
        const lines = block.split('\n').map((line) => line.trim()).filter(Boolean)
        if (lines.length === 0) return null

        const heading = lines.length === 1 ? lines[0].match(/^#{2,3}\s+(.+)$/) : null
        if (heading) return <h3 key={index}>{renderInline(heading[1])}</h3>

        const label = lines.length === 1 ? procedureLabel(lines[0]) : null
        if (label) return <h3 key={index} className="article-label">{label}</h3>

        if (lines.length === 1 && /^\*\*[^*]+\*\*$/.test(lines[0])) {
          return (
            <aside key={index} className="article-callout">
              <p>{renderInline(lines[0])}</p>
            </aside>
          )
        }

        if (lines.every((line) => line.startsWith('>'))) {
          const text = lines.map((line) => line.replace(/^>\s?/, '')).join(' ')
          return (
            <blockquote key={index}>
              <p>{renderInline(text)}</p>
            </blockquote>
          )
        }

        const isList = lines.every((line) => line.startsWith('- '))
        const isOrdered = lines.every((line) => /^\d+\.\s/.test(line))

        if (isList || isOrdered) {
          const List = isOrdered ? 'ol' : 'ul'
          return (
            <List key={index}>
              {lines.map((line, lineIndex) => (
                <li key={lineIndex}>{renderInline(line.replace(/^(?:- |\d+\.\s)/, ''))}</li>
              ))}
            </List>
          )
        }

        return <p key={index}>{renderInline(lines.join(' '))}</p>
      })}
    </>
  )
}
