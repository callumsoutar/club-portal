'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, ChevronDown, ChevronLeft, ChevronRight, ExternalLink, Menu, Play, Search, Tv } from 'lucide-react'
import { Logo } from '@/components/logo'
import { MessageBody } from '@/components/message-body'
import { SlideshowStart } from '@/components/slideshow-start'
import { TvSlideshow, type SlideshowContent } from '@/components/tv-slideshow'
import { companyInitials, type CompanySettings } from '@/lib/company-settings'
import { categoryClass, type SafetyMessage } from '@/lib/safety-messages'

type Message = SafetyMessage

const ARCHIVE_PAGE_SIZE = 8
const LEAD_COUNT = 5

function Header({ isAdmin, company, onMenu }: { isAdmin: boolean; company: CompanySettings; onMenu: () => void }) {
  return (
    <header className="site-header">
      <div className="header-inner">
        <a href="#top" aria-label={`${company.companyName} home`}><Logo companyName={company.companyName} logoUrl={company.logoUrl} /></a>
        <nav className="desktop-nav" aria-label="Main navigation">
          <a className="active" href="#latest">Latest</a>
          <a href="#archive">Archive</a>
          <a href="#categories">Categories</a>
        </nav>
        <div className="header-actions">
          {isAdmin ? <Link className="tv-link" href="/admin">Edit messages</Link> : <Link className="sign-in-link" href="/login">Sign in</Link>}
          {isAdmin ? <Link className="tv-link" href="/tv"><Tv size={16} /> TV slideshow</Link> : null}
          <button className="icon-button mobile-menu" onClick={onMenu} aria-label="Open navigation"><Menu size={20} /></button>
        </div>
      </div>
    </header>
  )
}

function SearchBox({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <label className="search-box"><Search size={18} /><span className="sr-only">Search safety messages</span><input value={value} onChange={(e) => onChange(e.target.value)} placeholder="Search safety messages" /><kbd>⌘ K</kbd></label>
}

function CategoryPills({ categories, selected, onSelect }: { categories: string[]; selected: string; onSelect: (value: string) => void }) {
  return <div className="category-pills" id="categories">{categories.map((category) => <button key={category} className={selected === category ? 'selected' : ''} onClick={() => onSelect(category)}>{category}</button>)}</div>
}

function MessageRow({ message, featured = false, onOpen }: { message: Message; featured?: boolean; onOpen: (message: Message) => void }) {
  return <button className={`message-row ${featured ? 'featured-row' : ''}`} onClick={() => onOpen(message)}>
    <div className="message-meta"><span className={`category-dot ${categoryClass(message.category)}`}></span><span>{message.category}</span><span className="meta-divider">·</span><span>{message.date}</span></div>
    <div className="message-content"><h3>{message.title}</h3><p>{message.description}</p></div>
    <div className="message-end"><span>{message.read}</span><ArrowRight size={17} /></div>
  </button>
}

function relatedMessages(current: Message, all: Message[]) {
  const others = all.filter((item) => item.id !== current.id)
  const sameCategory = others.filter((item) => item.category === current.category)
  const rest = others.filter((item) => item.category !== current.category)
  return [...sameCategory, ...rest].slice(0, 2)
}

function Article({ message, messages, isAdmin, company, onBack, onOpen }: { message: Message; messages: Message[]; isAdmin: boolean; company: CompanySettings; onBack: () => void; onOpen: (message: Message) => void }) {
  const related = relatedMessages(message, messages)

  return <main className="article-page">
    <div className="article-shell" key={message.id}>
      <button className="back-link" onClick={onBack}><ChevronLeft size={16} /> Back to latest</button>
      <div className="article-kicker"><span className="blue-dot"></span>{message.category}<span>·</span>{message.date}{isAdmin ? <Link href={`/admin/messages/${message.databaseId}`}>Edit</Link> : null}</div>
      <h1>{message.title}</h1>
      <p className="article-lede">{message.description}</p>
      <div className="article-byline"><div className="author-avatar">{companyInitials(company.companyName)}</div><div><strong>{company.companyName}</strong><span>Safety communication · {message.read}</span></div></div>
      {message.imageUrl ? <img className="article-image" src={message.imageUrl} alt={message.imageAlt} /> : null}
      <article className="article-copy">
        <MessageBody markdown={message.body} />
      </article>
      {message.links.length > 0 && (
        <section className="attachments" aria-label="Further reading">
          <h2>Further reading</h2>
          <ul className="reading-list">
            {message.links.map((link) => (
              <li key={link.url}>
                <a href={link.url} target="_blank" rel="noopener noreferrer">
                  <span>{link.label}</span>
                  <ExternalLink size={15} aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
      {related.length > 0 && (
        <section className="related">
          <div className="section-heading">
            <div><span className="eyebrow">Keep reading</span><h2>Related messages</h2></div>
            <button onClick={onBack}>View archive <ArrowRight size={15} /></button>
          </div>
          <div className="related-grid">
            {related.map((item) => (
              <button key={item.id} onClick={() => onOpen(item)}>
                <span>{item.category}</span>
                <strong>{item.title}</strong>
                <small>{item.date} <ArrowRight size={14} /></small>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  </main>
}

function WeeklyFeature({ messages: items, onOpen }: { messages: Message[]; onOpen: (message: Message) => void }) {
  const [index, setIndex] = useState(0)
  const tabs = useRef<Array<HTMLButtonElement | null>>([])
  const total = items.length
  const message = items[index]

  if (!message || total === 0) return null

  const go = (next: number, focusTab = false) => {
    const wrapped = (next + total) % total
    setIndex(wrapped)
    if (focusTab) tabs.current[wrapped]?.focus()
  }

  return (
    <section className="weekly" aria-roledescription="carousel" aria-label="This week's safety message">
      <div className={`weekly-frame${message.imageUrl ? '' : ' no-visual'}`}>
        <div className="weekly-copy">
          <div className="weekly-stage" id="weekly-panel" role="tabpanel" aria-labelledby={`weekly-tab-${message.id}`} key={message.id}>
            <div className="weekly-kicker">
              <span className="pulse" />
              {index === 0 ? "This week's safety message" : 'Recent safety message'}
              <span className="weekly-count">
                {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
              </span>
            </div>
            <h1>{message.title}</h1>
            <p className="weekly-lede">{message.description}</p>
            <div className="weekly-meta">
              <span>{message.category}</span>
              <span aria-hidden="true">·</span>
              <time>{message.date}</time>
              <span aria-hidden="true">·</span>
              <span>{message.read}</span>
            </div>
          </div>
          <div className="weekly-actions">
            <button className="weekly-read" onClick={() => onOpen(message)}>
              Read message <ArrowRight size={16} />
            </button>
            <div className="weekly-arrows">
              <button type="button" aria-label="Previous message" onClick={() => go(index - 1)}>
                <ChevronLeft size={18} />
              </button>
              <button type="button" aria-label="Next message" onClick={() => go(index + 1)}>
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>
        {message.imageUrl ? (
          <figure className="weekly-visual">
            <img src={message.imageUrl} alt={message.imageAlt} />
            {message.caption ? <figcaption>{message.caption}</figcaption> : null}
          </figure>
        ) : null}
      </div>
      <div
        className="weekly-strip"
        role="tablist"
        aria-label="Latest safety messages"
        onKeyDown={(event) => {
          if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
          event.preventDefault()
          go(event.key === 'ArrowRight' ? index + 1 : index - 1, true)
        }}
      >
        {items.map((item, itemIndex) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`weekly-tab-${item.id}`}
            aria-selected={itemIndex === index}
            aria-controls="weekly-panel"
            tabIndex={itemIndex === index ? 0 : -1}
            className={itemIndex === index ? 'active' : ''}
            ref={(node) => { tabs.current[itemIndex] = node }}
            onClick={() => setIndex(itemIndex)}
          >
            <span>{String(itemIndex + 1).padStart(2, '0')}</span>
            <strong>{item.title}</strong>
            <small>{item.date}</small>
          </button>
        ))}
      </div>
    </section>
  )
}

function Slideshow({ messages, company, onLeave }: { messages: Message[]; company: CompanySettings; onLeave: () => void }) {
  const [content, setContent] = useState<SlideshowContent | null>(null)

  useEffect(() => {
    document.body.classList.add('tv-body')
    return () => document.body.classList.remove('tv-body')
  }, [])

  if (!content) {
    return <SlideshowStart companyName={company.companyName} logoUrl={company.logoUrl} onChoose={setContent} onLeave={onLeave} />
  }

  return (
    <TvSlideshow
      messages={messages}
      companyName={company.companyName}
      logoUrl={company.logoUrl}
      content={content}
      mode="preview"
      onExit={() => setContent(null)}
    />
  )
}

function MobileNav({ isAdmin, onNavigate }: { isAdmin: boolean; onNavigate: () => void }) {
  return (
    <div className="mobile-nav">
      <a href="#latest" onClick={onNavigate}>Latest</a>
      <a href="#archive" onClick={onNavigate}>Archive</a>
      <a href="#categories" onClick={onNavigate}>Categories</a>
      {isAdmin ? <Link href="/admin" onClick={onNavigate}>Edit messages</Link> : <Link href="/login" onClick={onNavigate}>Sign in</Link>}
      {isAdmin ? <Link href="/tv" onClick={onNavigate}>TV slideshow</Link> : null}
    </div>
  )
}

export function HomePage({ messages, isAdmin, company }: { messages: Message[]; isAdmin: boolean; company: CompanySettings }) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All messages')
  const [openMessage, setOpenMessage] = useState<Message | null>(null)
  const [slideshow, setSlideshow] = useState(false)
  const [menu, setMenu] = useState(false)
  const [visibleCount, setVisibleCount] = useState(ARCHIVE_PAGE_SIZE)
  const [filterSnapshot, setFilterSnapshot] = useState('All messages\0')
  const filterKey = `${category}\0${query}`

  if (filterSnapshot !== filterKey) {
    setFilterSnapshot(filterKey)
    setVisibleCount(ARCHIVE_PAGE_SIZE)
  }

  const categories = useMemo(() => {
    const names = [...new Set(messages.map((message) => message.category))].sort((a, b) => a.localeCompare(b, 'en'))
    return ['All messages', ...names]
  }, [messages])
  const leadMessages = useMemo(() => messages.slice(0, LEAD_COUNT), [messages])
  const filtered = useMemo(() => messages.filter((message) => (category === 'All messages' || message.category === category) && `${message.title} ${message.description} ${message.category}`.toLowerCase().includes(query.toLowerCase())), [messages, category, query])
  const recent = useMemo(() => (category === 'All messages' && !query ? filtered.slice(1) : filtered).slice(0, 3), [filtered, category, query])
  const archive = filtered.slice(0, visibleCount)

  if (isAdmin && slideshow) return <Slideshow messages={messages} company={company} onLeave={() => setSlideshow(false)} />
  if (openMessage) return <><Header isAdmin={isAdmin} company={company} onMenu={() => setMenu(!menu)} />{menu && <MobileNav isAdmin={isAdmin} onNavigate={() => setMenu(false)} />}<Article message={openMessage} messages={messages} isAdmin={isAdmin} company={company} onBack={() => setOpenMessage(null)} onOpen={setOpenMessage} /></>

  return <div id="top"><Header isAdmin={isAdmin} company={company} onMenu={() => setMenu(!menu)} />{menu && <MobileNav isAdmin={isAdmin} onNavigate={() => setMenu(false)} />}<main>
    <WeeklyFeature messages={leadMessages} onOpen={setOpenMessage} />
    <section className="latest-section" id="latest"><div className="section-heading"><div><span className="eyebrow">Earlier briefings</span><h2>Recent safety messages</h2></div><button onClick={() => document.getElementById('archive')?.scrollIntoView({ behavior: 'smooth' })}>View all messages <ArrowRight size={15} /></button></div><CategoryPills categories={categories} selected={category} onSelect={setCategory} /><div className="latest-list">{recent.length ? recent.map((message) => <MessageRow key={message.id} message={message} onOpen={setOpenMessage} />) : <div className="empty-state">No messages found. Try another search or category.</div>}</div></section>
    <section className="archive-preview" id="archive"><div className="archive-intro"><div><span className="eyebrow">The archive</span><h2>Everything in<br /><em>one place.</em></h2></div><p>Browse every message published by the {company.companyName} safety team. Use search or filters to find exactly what you need.</p></div><div className="archive-toolbar"><SearchBox value={query} onChange={setQuery} /><button className="sort-button" type="button">Newest first <ChevronDown size={15} /></button></div><div className="archive-list">{archive.length ? archive.map((message) => <MessageRow key={message.id} message={message} onOpen={setOpenMessage} />) : <div className="empty-state">No messages found. Try another search or category.</div>}</div>{visibleCount < filtered.length && <button className="load-more" type="button" onClick={() => setVisibleCount((count) => count + ARCHIVE_PAGE_SIZE)}>Load more messages <ChevronDown size={16} /></button>}</section>
    {isAdmin ? <section className="tv-banner"><div><span className="eyebrow orange-eyebrow">For the clubhouse</span><h2>Put safety in<br /><em>the picture.</em></h2><p>Leave the briefing room display open on a clubhouse TV. Safety messages rotate on their own, so members can read them while they wait.</p></div><div className="tv-banner-actions"><button onClick={() => setSlideshow(true)} className="tv-button"><Play size={15} fill="currentColor" /> Preview TV slideshow <ArrowRight size={16} /></button><Link className="tv-open" href="/tv">Open on the briefing room TV <ExternalLink size={14} /></Link></div></section> : null}
  </main><footer><Logo companyName={company.companyName} logoUrl={company.logoUrl} /><span>Safety is a shared responsibility.</span>{isAdmin ? <Link href="/tv">TV slideshow <ExternalLink size={13} /></Link> : <Link href="/login">Sign in</Link>}</footer></div>
}
