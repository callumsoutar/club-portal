'use client'

import { useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'

import { Bold, Heading3, Italic, Link2, List, ListOrdered, Quote } from 'lucide-react'

import { htmlToMarkdown, markdownToHtml } from '@/lib/safety-message-markdown'

type MarkdownEditorProps = {
  id: string
  name: string
  value: string
  error?: string
  onChange: (value: string) => void
  onBlur: () => void
  inputRef: (node: HTMLElement | null) => void
}

export function MarkdownEditor({ id, name, value, error, onChange, onBlur, inputRef }: MarkdownEditorProps) {
  const [mode, setMode] = useState<'write' | 'source'>('write')
  const [linkDraft, setLinkDraft] = useState<string | null>(null)
  const surfaceRef = useRef<HTMLDivElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const selectionRef = useRef<{ start: number; end: number } | null>(null)
  const linkRangeRef = useRef<Range | null>(null)
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const linkInputId = `${id}-link`

  useLayoutEffect(() => {
    const textarea = textareaRef.current
    const selection = selectionRef.current
    if (!textarea || !selection || mode !== 'source') return
    textarea.focus()
    textarea.setSelectionRange(selection.start, selection.end)
    selectionRef.current = null
  }, [value, mode])

  useLayoutEffect(() => {
    const surface = surfaceRef.current
    if (!surface || mode !== 'write') return
    if (document.activeElement === surface) return
    const html = markdownToHtml(value)
    if (surface.innerHTML !== html) surface.innerHTML = html
    surface.classList.toggle('is-empty', !value.trim())
  }, [value, mode])

  function setSurface(node: HTMLDivElement | null) {
    surfaceRef.current = node
    if (node && mode === 'write') inputRef(node)
  }

  function setTextarea(node: HTMLTextAreaElement | null) {
    textareaRef.current = node
    if (node && mode === 'source') inputRef(node)
  }

  function publishSurface() {
    const surface = surfaceRef.current
    if (!surface) return
    surface.classList.toggle('is-empty', !surface.textContent?.trim())
    const next = htmlToMarkdown(surface)
    if (next !== value) onChange(next)
  }

  function focusSurface() {
    const surface = surfaceRef.current
    if (!surface) return
    surface.focus()
    document.execCommand('defaultParagraphSeparator', false, 'p')
  }

  function runCommand(command: string, argument?: string) {
    focusSurface()
    document.execCommand(command, false, argument)
    publishSurface()
  }

  function currentElement() {
    const node = window.getSelection()?.anchorNode
    if (!node) return null
    return node instanceof Element ? node : node.parentElement
  }

  function replace(next: string, start: number, end: number) {
    selectionRef.current = { start, end }
    onChange(next)
  }

  function wrap(before: string, after: string, placeholder: string) {
    const textarea = textareaRef.current
    if (!textarea) return
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selected = value.slice(start, end)
    const alreadyWrapped =
      selected.length > before.length + after.length &&
      selected.startsWith(before) &&
      selected.endsWith(after)
    const surroundingWrapped =
      value.slice(start - before.length, start) === before &&
      value.slice(end, end + after.length) === after &&
      selected.length > 0

    if (alreadyWrapped) {
      const inner = selected.slice(before.length, selected.length - after.length)
      replace(value.slice(0, start) + inner + value.slice(end), start, start + inner.length)
      return
    }

    if (surroundingWrapped) {
      replace(
        value.slice(0, start - before.length) + selected + value.slice(end + after.length),
        start - before.length,
        end - before.length,
      )
      return
    }

    const inner = selected || placeholder
    replace(value.slice(0, start) + before + inner + after + value.slice(end), start + before.length, start + before.length + inner.length)
  }

  function mapSelectedLines(transform: (lines: string[]) => string[]) {
    const textarea = textareaRef.current
    if (!textarea) return
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const lineStart = start === 0 ? 0 : value.lastIndexOf('\n', start - 1) + 1
    const probe = end > start ? end - 1 : end
    const newline = value.indexOf('\n', probe)
    const lineEnd = newline === -1 ? value.length : newline
    const lines = value.slice(lineStart, lineEnd).split('\n')
    const nextLines = transform(lines)
    const nextBlock = nextLines.join('\n')
    replace(value.slice(0, lineStart) + nextBlock + value.slice(lineEnd), lineStart, lineStart + nextBlock.length)
  }

  function toggleHeading() {
    if (mode === 'write') {
      const heading = currentElement()?.closest('h1, h2, h3, h4')
      runCommand('formatBlock', heading ? 'p' : 'h3')
      return
    }
    const heading = /^#{2,3}\s+/
    mapSelectedLines((lines) => {
      const marked = lines.filter((line) => line.trim()).every((line) => heading.test(line))
      return lines.map((line) => {
        if (!line.trim()) return line
        if (marked) return line.replace(heading, '')
        if (heading.test(line)) return line
        return `### ${line}`
      })
    })
  }

  function toggleQuote() {
    if (mode === 'write') {
      const quote = currentElement()?.closest('blockquote')
      if (quote) {
        const paragraph = document.createElement('p')
        paragraph.innerHTML = quote.innerHTML
        quote.replaceWith(paragraph)
        publishSurface()
        return
      }
      runCommand('formatBlock', 'blockquote')
      return
    }
    const quote = /^>\s?/
    mapSelectedLines((lines) => {
      const marked = lines.filter((line) => line.trim()).every((line) => quote.test(line))
      return lines.map((line) => {
        if (!line.trim()) return line
        if (marked) return line.replace(quote, '')
        if (quote.test(line)) return line
        return `> ${line}`
      })
    })
  }

  function toggleList(ordered: boolean) {
    if (mode === 'write') {
      runCommand(ordered ? 'insertOrderedList' : 'insertUnorderedList')
      return
    }
    const bullet = /^- /
    const number = /^\d+\.\s+/
    mapSelectedLines((lines) => {
      const pattern = ordered ? number : bullet
      const marked = lines.filter((line) => line.trim()).every((line) => pattern.test(line))
      let count = 1
      return lines.map((line) => {
        if (!line.trim()) return line
        const text = line.replace(bullet, '').replace(number, '')
        if (marked) return text
        return ordered ? `${count++}. ${text}` : `- ${text}`
      })
    })
  }

  function applyBold() {
    if (mode === 'write') {
      runCommand('bold')
      return
    }
    wrap('**', '**', 'bold')
  }

  function applyItalic() {
    if (mode === 'write') {
      runCommand('italic')
      return
    }
    wrap('*', '*', 'italic')
  }

  function openLink() {
    if (mode === 'source') {
      const textarea = textareaRef.current
      if (!textarea) return
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const selected = value.slice(start, end)
      if (/^https:\/\/\S+$/.test(selected)) {
        const next = `${value.slice(0, start)}[link text](${selected})${value.slice(end)}`
        replace(next, start + 1, start + 10)
        return
      }
      const label = selected || 'link text'
      const next = `${value.slice(0, start)}[${label}](https://)${value.slice(end)}`
      const urlStart = start + label.length + 3
      replace(next, urlStart, urlStart + 'https://'.length)
      return
    }

    const selection = window.getSelection()
    linkRangeRef.current = selection && selection.rangeCount > 0 ? selection.getRangeAt(0).cloneRange() : null
    setLinkDraft('https://')
  }

  function applyLink() {
    const url = linkDraft?.trim() ?? ''
    if (!/^https:\/\/\S+$/.test(url)) return
    const surface = surfaceRef.current
    const range = linkRangeRef.current
    if (!surface || !range) return
    surface.focus()
    const selection = window.getSelection()
    selection?.removeAllRanges()
    selection?.addRange(range)
    document.execCommand('createLink', false, url)
    setLinkDraft(null)
    linkRangeRef.current = null
    publishSurface()
  }

  function onSurfaceKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!(event.metaKey || event.ctrlKey) || event.altKey) return
    const key = event.key.toLowerCase()
    if (key === 'b') {
      event.preventDefault()
      applyBold()
    } else if (key === 'i') {
      event.preventDefault()
      applyItalic()
    } else if (key === 'k') {
      event.preventDefault()
      openLink()
    }
  }

  function onSourceKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (!(event.metaKey || event.ctrlKey) || event.altKey) return
    const key = event.key.toLowerCase()
    if (key === 'b') {
      event.preventDefault()
      wrap('**', '**', 'bold')
    } else if (key === 'i') {
      event.preventDefault()
      wrap('*', '*', 'italic')
    } else if (key === 'k') {
      event.preventDefault()
      openLink()
    }
  }

  function onPaste(event: React.ClipboardEvent<HTMLDivElement>) {
    const text = event.clipboardData.getData('text/plain')
    if (!/(\*\*|^#{2,3}\s|^-\s|^\d+\.\s|^>\s)/m.test(text)) return
    event.preventDefault()
    focusSurface()
    document.execCommand('insertHTML', false, markdownToHtml(text))
    publishSurface()
  }

  return (
    <div className="markdown-field">
      <div className="markdown-field-head">
        <label id={`${id}-label`} htmlFor={mode === 'source' ? id : undefined}>Body</label>
        <div className="markdown-modes" role="tablist" aria-label="Body view">
          <button
            id={`${id}-write-tab`}
            type="button"
            role="tab"
            aria-selected={mode === 'write'}
            aria-controls={`${id}-write`}
            onClick={() => {
              setLinkDraft(null)
              setMode('write')
            }}
          >
            Write
          </button>
          <button
            id={`${id}-source-tab`}
            type="button"
            role="tab"
            aria-selected={mode === 'source'}
            aria-controls={`${id}-source`}
            onClick={() => {
              setLinkDraft(null)
              setMode('source')
            }}
          >
            Markdown
          </button>
        </div>
      </div>

      <div className="markdown-editor">
        <div className="markdown-toolbar" role="toolbar" aria-label="Formatting">
          <ToolbarButton label="Bold" shortcut="⌘B" onClick={applyBold}>
            <Bold size={15} />
          </ToolbarButton>
          <ToolbarButton label="Italic" shortcut="⌘I" onClick={applyItalic}>
            <Italic size={15} />
          </ToolbarButton>
          <span className="markdown-toolbar-gap" aria-hidden="true" />
          <ToolbarButton label="Heading" onClick={toggleHeading}>
            <Heading3 size={15} />
          </ToolbarButton>
          <ToolbarButton label="Quote" onClick={toggleQuote}>
            <Quote size={15} />
          </ToolbarButton>
          <span className="markdown-toolbar-gap" aria-hidden="true" />
          <ToolbarButton label="Bulleted list" onClick={() => toggleList(false)}>
            <List size={15} />
          </ToolbarButton>
          <ToolbarButton label="Numbered list" onClick={() => toggleList(true)}>
            <ListOrdered size={15} />
          </ToolbarButton>
          <span className="markdown-toolbar-gap" aria-hidden="true" />
          <ToolbarButton label="Link" shortcut="⌘K" onClick={openLink}>
            <Link2 size={15} />
          </ToolbarButton>
        </div>

        {linkDraft !== null ? (
          <div className="markdown-link-row">
            <label className="sr-only" htmlFor={linkInputId}>Link URL</label>
            <input
              id={linkInputId}
              value={linkDraft}
              placeholder="https://"
              onChange={(event) => setLinkDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  applyLink()
                }
                if (event.key === 'Escape') setLinkDraft(null)
              }}
            />
            <button type="button" onClick={applyLink}>Add link</button>
            <button type="button" onClick={() => setLinkDraft(null)}>Cancel</button>
          </div>
        ) : null}

        {mode === 'write' ? (
          <div id={`${id}-write`} role="tabpanel" aria-labelledby={`${id}-write-tab`}>
            <div
              id={id}
              ref={setSurface}
              className="markdown-surface article-copy"
              contentEditable
              role="textbox"
              aria-multiline="true"
              aria-labelledby={`${id}-label`}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? `${hintId} ${errorId}` : hintId}
              spellCheck
              suppressContentEditableWarning
              onInput={publishSurface}
              onBlur={onBlur}
              onKeyDown={onSurfaceKeyDown}
              onPaste={onPaste}
              onClick={(event) => {
                const link = (event.target as HTMLElement).closest('a')
                if (link) event.preventDefault()
              }}
            />
          </div>
        ) : (
          <div id={`${id}-source`} role="tabpanel" aria-labelledby={`${id}-source-tab`}>
            <textarea
              id={id}
              name={name}
              ref={setTextarea}
              rows={16}
              value={value}
              spellCheck
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? `${hintId} ${errorId}` : hintId}
              onChange={(event) => onChange(event.target.value)}
              onBlur={onBlur}
              onKeyDown={onSourceKeyDown}
            />
          </div>
        )}
      </div>

      <small id={hintId}>
        {mode === 'write'
          ? 'Bold, italics, headings, and lists appear here as members will read them.'
          : 'This is the Markdown source. Switch back to Write to see it formatted.'}
      </small>
      {error ? <small id={errorId} className="form-error">{error}</small> : null}
    </div>
  )
}

function ToolbarButton({
  label,
  shortcut,
  onClick,
  children,
}: {
  label: string
  shortcut?: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={shortcut ? `${label} (${shortcut})` : label}
      title={shortcut ? `${label} (${shortcut})` : label}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
