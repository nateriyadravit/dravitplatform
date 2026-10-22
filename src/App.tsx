import { useEffect, useEffectEvent, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  ChevronDown,
  ExternalLink,
  Layers3,
  Menu,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react'
import {
  BrowserRouter,
  Link,
  NavLink,
  Route,
  Routes,
  useNavigate,
  useLocation,
  useParams,
} from 'react-router-dom'
import { AuthProvider } from './AuthContext'
import { useAuth } from './auth'
import { useDemoCatalog, type DemoProject } from './useDemoCatalog'
import { useAgencyMotion } from './useAgencyMotion'
import './App.css'

const email = 'nateriyadravit@gmail.com'

const navItems = [
  { label: 'Home', to: '/' },
  { label: 'Work', to: '/work' },
  { label: 'Services', to: '/services' },
  { label: 'About', to: '/about' },
  { label: 'Contact', to: '/contact' },
]

function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { user, signOut } = useAuth()

  return (
    <header className="agency-nav">
      <span className="agency-scroll-progress" aria-hidden="true" />
      <div className="agency-nav-inner wrap">
        <Link className="agency-wordmark" to="/" onClick={() => setMenuOpen(false)} aria-label="DRAVIT home">
          <span>DRAVIT</span><i />
        </Link>
        <button
          className="menu-toggle icon-button agency-menu-toggle"
          type="button"
          aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        <nav className={menuOpen ? 'agency-nav-links is-open' : 'agency-nav-links'} aria-label="Main navigation">
          {navItems.map((item) => (
            <NavLink
              end={item.to === '/'}
              key={item.to}
              to={item.to}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) => (isActive ? 'agency-nav-link active' : 'agency-nav-link')}
            >
              {item.label}
            </NavLink>
          ))}
          {user && <NavLink className={({ isActive }) => `agency-nav-link${user.role === 'admin' ? ' agency-nav-link-admin' : ''}${isActive ? ' active' : ''}`} to={user.role === 'admin' ? '/admin' : '/dashboard'} onClick={() => setMenuOpen(false)}>{user.role === 'admin' ? 'Studio admin' : 'My projects'}</NavLink>}
          <Link className="agency-nav-cta" to="/order" onClick={() => setMenuOpen(false)}>
            Start a project <ArrowUpRight size={14} />
          </Link>
          {user ? <button className="agency-signout" type="button" onClick={() => { void signOut(); setMenuOpen(false) }}>Sign out</button> : <Link className="agency-signin" to="/login" onClick={() => setMenuOpen(false)}>Sign in</Link>}
        </nav>
      </div>
    </header>
  )
}

function Footer() {
  return (
    <footer className="agency-footer" data-reveal>
      <div className="agency-footer-main wrap">
        <div className="agency-footer-intro">
          <Link className="agency-wordmark" to="/">
            <span>DRAVIT</span><i />
          </Link>
          <p>Strategy, design and technology<br />for what comes next.</p>
        </div>
        <div className="agency-footer-links">
          <div><span>Explore</span><Link to="/work">Selected work</Link><Link to="/services">Services</Link><Link to="/about">About DRAVIT</Link></div>
          <div><span>Say hello</span><a href={`mailto:${email}`}>{email}</a><Link to="/order">Start a project <ArrowUpRight size={13} /></Link></div>
        </div>
      </div>
      <div className="agency-footer-bottom wrap"><span>© 2026 DRAVIT NATERIYA</span><span>Independent digital studio · Bhopal, India</span><a href="#top">Back to top ↑</a></div>
    </footer>
  )
}

function ProjectCard({ project, index = 0, layout = 'standard' }: { project: DemoProject; index?: number; layout?: 'standard' | 'feature' }) {
  return (
    <article className={`work-project work-project-${layout}`} style={{ '--project-order': index } as React.CSSProperties} data-reveal>
      <a className="work-project-visual" href={project.live_url} target="_blank" rel="noopener noreferrer" aria-label={`Open live ${project.name} website in a new tab`} data-image-reveal>
        <img src={project.preview_image} alt={`${project.name} live website imagery`} loading="lazy" />
        <span className="project-visual-index">0{index + 1} / SELECTED WORK</span>
        <span className="project-visual-open"><ExternalLink size={17} /></span>
        <span className="project-visual-caption">LIVE WEBSITE <i /> {project.category.toUpperCase()}</span>
      </a>
      <div className="work-project-copy">
        <span className="project-category">{project.category}</span>
        <h3>{project.name}</h3>
        <p>{project.description}</p>
        <ul>{project.highlights.slice(0, 3).map((highlight) => <li key={highlight}>{highlight}</li>)}</ul>
        <div className="work-project-actions">
          <a href={project.live_url} target="_blank" rel="noopener noreferrer">View live website <ExternalLink size={14} /></a>
          <Link to={`/order?website=${encodeURIComponent(project.name)}`}>Choose this design <ArrowRight size={14} /></Link>
        </div>
      </div>
    </article>
  )
}

function HomePage() {
  const { demos, loading } = useDemoCatalog({ sort: 'category' })
  const featured = demos.slice(0, 2)

  return (
    <main className="agency-home">
      <section className="agency-hero" data-agency-hero>
        <div className="agency-hero-grid wrap">
          <div className="agency-hero-copy">
            <p className="agency-kicker" data-hero-eyebrow><i /> INDEPENDENT DIGITAL STUDIO <span>·</span> PROJECTS WORLDWIDE</p>
            <h1>
              <span className="hero-line"><span className="hero-line-inner">WE BUILD DIGITAL</span></span>
              <span className="hero-line"><span className="hero-line-inner">EXPERIENCES THAT</span></span>
              <span className="hero-line"><span className="hero-line-inner hero-line-emphasis">MOVE BRANDS FORWARD.</span></span>
            </h1>
            <p className="agency-hero-description" data-hero-copy>Strategy, design, and technology come together to create exceptional websites for ambitious businesses.</p>
            <div className="agency-hero-actions" data-hero-actions>
              <Link to="/work" className="agency-button agency-button-light">Explore our work <ArrowDown size={15} /></Link>
              <Link to="/order" className="agency-button agency-button-quiet">Start a project <ArrowUpRight size={15} /></Link>
            </div>
            <div className="agency-availability"><span className="availability-dot" /> Project enquiries <strong>open</strong><span className="availability-rule" /> DRAVIT NATERIYA · FOUNDER & CEO</div>
          </div>
          <div className="agency-hero-art" data-hero-art>
            <div className="hero-art-orbit hero-art-orbit-one" />
            <div className="hero-art-orbit hero-art-orbit-two" />
            <span className="hero-art-sticker hero-art-sticker-top"><i /> IDEA <b>×</b> INTERFACE</span>
            <div className="hero-art-window">
              <div className="hero-art-window-top"><i /><i /><i /><span>DRAVIT / DIGITAL STUDIO</span></div>
              <div className="hero-art-window-content"><span>DESIGN WITH PURPOSE</span><strong>Digital<br /><em>experiences.</em></strong><i /></div>
              <div className="hero-art-window-footer"><span>STRATEGY</span><span>DESIGN</span><span>DEVELOPMENT</span></div>
            </div>
            <span className="hero-art-sticker hero-art-sticker-bottom"><strong>01—04</strong><span>THINK · MAKE · LAUNCH</span></span>
            <span className="hero-art-vertical">INDEPENDENT DIGITAL STUDIO</span>
          </div>
        </div>
        <div className="agency-hero-bottom wrap"><span>DESIGN-LED DIGITAL, BUILT WITH INTENT</span><span className="hero-bottom-rule" /><a href="#selected-work">SCROLL TO EXPLORE <ArrowDown size={13} /></a></div>
      </section>

      <section className="agency-statement" data-reveal><div className="wrap statement-grid"><span className="editorial-kicker">THE STUDIO / 01</span><p>Ambitious brands need more than a website.<br /><em>They need a point of view.</em></p><span className="statement-mark">D.</span></div></section>

      <section className="showcase-section" id="selected-work" data-horizontal-showcase>
        <div className="showcase-heading wrap"><div><span className="editorial-kicker">SELECTED WORK / 02 LIVE DEMOS</span><h2>Made to be<br /><em>experienced.</em></h2></div><p>Two real businesses. Two distinct directions.<br />Explore their live websites, then make the next one yours.</p><Link to="/work">Explore all categories <ArrowRight size={15} /></Link></div>
        <div className="showcase-track">
          {loading ? <p className="catalog-loading">Loading selected work…</p> : featured.map((project, index) => <ProjectCard key={project.slug} project={project} index={index} layout="feature" />)}
          <Link to="/work" className="showcase-more"><span className="editorial-kicker">THE NEXT PROJECT</span><strong>Could be<br /><em>yours.</em></strong><span>Explore website categories <ArrowRight size={15} /></span></Link>
        </div>
        <div className="showcase-scroll wrap"><span>SCROLL TO MOVE THROUGH THE WORK</span><span>01 — {String(Math.max(featured.length, 1)).padStart(2, '0')}</span></div>
      </section>

      <section className="services-editorial" data-reveal>
        <div className="wrap services-editorial-grid"><div className="services-editorial-intro"><span className="editorial-kicker">WHAT WE DO / 03</span><h2>Good thinking.<br /><em>Beautifully built.</em></h2><p>From first conversation to launch day, we shape a digital experience around your business, your audience, and what you want to change.</p><Link to="/services" className="agency-text-link">Explore our services <ArrowRight size={15} /></Link></div><div className="service-list">
          {['Website design', 'Website development', 'E-commerce development', 'Landing page design', 'Business websites', 'Website redesign', 'Website maintenance', 'Custom web applications'].map((service, index) => <Link to="/services" className="service-row" key={service}><span>0{index + 1}</span><strong>{service}</strong><ArrowUpRight size={16} /></Link>)}
        </div></div>
      </section>

      <section className="process-editorial" data-reveal><div className="wrap process-heading"><span className="editorial-kicker">A CLEAR WAY FORWARD / 04</span><h2>Four steps.<br /><em>One good outcome.</em></h2><p>A focused process keeps the work thoughtful and the decisions clear.</p></div><div className="wrap process-list">
        {[['01', 'Discover', 'We understand the business, the goals, and the people you want to reach.'], ['02', 'Design', 'We set a visual direction and shape a website experience around the story.'], ['03', 'Develop', 'We turn the approved design into a responsive, accessible working website.'], ['04', 'Launch', 'We test, refine, and prepare the website for its next chapter.']].map(([number, title, copy]) => <article className="process-step" key={number}><span>{number}</span><h3>{title}</h3><p>{copy}</p><i /></article>)}
      </div></section>

      <section className="agency-final-cta" data-reveal><div className="wrap agency-final-inner"><span className="editorial-kicker">HAVE A GOOD ONE IN MIND?</span><h2>Let’s move your<br /><em>brand forward.</em></h2><p>Tell us where you want to go. We’ll help you make a thoughtful plan to get there.</p><Link to="/order" className="agency-button agency-button-light">Start a project <ArrowUpRight size={15} /></Link></div></section>
    </main>
  )
}

function WorkPage() {
  const [activeCategory, setActiveCategory] = useState('all')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('name')
  const { demos, categories, loading, error } = useDemoCatalog({ category: activeCategory, search, sort })
  const selectedCategory = categories.find((category) => category.slug === activeCategory)
  const totalLiveDemos = categories.reduce((total, category) => total + category.live_count, 0)

  return <main className="work-explorer">
    <section className="work-page-intro wrap" data-reveal>
      <span className="editorial-kicker">THE DRAVIT PROJECT INDEX / 2026</span>
      <h1>Different businesses.<br /><em>Distinct digital worlds.</em></h1>
      <div className="work-intro-bottom"><p>Explore the two live website demos, each grounded in a real local business. The next project could be yours.</p><span>02 LIVE PROJECTS<br />15 CATEGORIES</span></div>
    </section>
    <section className="catalog-tools wrap" aria-label="Explore demo websites">
      <label className="catalog-search"><Search size={17} /><span className="sr-only">Search website categories</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search projects or categories" /></label>
      <label className="catalog-sort"><span>SORT</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="name">Name</option><option value="category">Category</option></select><ChevronDown size={13} /></label>
    </section>
    <div className="category-index wrap" role="group" aria-label="Filter website demos by category">
      <button type="button" className={activeCategory === 'all' ? 'category-tab is-active' : 'category-tab'} onClick={() => setActiveCategory('all')}>All categories <span>{totalLiveDemos}</span></button>
      {categories.map((category) => <button type="button" key={category.slug} className={activeCategory === category.slug ? 'category-tab is-active' : 'category-tab'} onClick={() => setActiveCategory(category.slug)}>{category.name}<span>{category.live_count}</span></button>)}
    </div>
    <section className="catalog-results wrap" aria-live="polite">
      {loading && <p className="catalog-loading">Loading projects…</p>}
      {error && <p className="catalog-error" role="alert">{error}</p>}
      {!loading && !error && demos.length > 0 && <><div className="catalog-result-count"><span>{selectedCategory?.name ?? 'All categories'}</span><span>{demos.length} {demos.length === 1 ? 'LIVE DEMO' : 'LIVE DEMOS'}</span></div><div className="catalog-project-list">{demos.map((project, index) => <ProjectCard key={project.slug} project={project} index={index} layout={index % 2 === 0 ? 'feature' : 'standard'} />)}</div></>}
      {!loading && !error && demos.length === 0 && <section className="catalog-empty"><span className="editorial-kicker">A CATEGORY, READY FOR ITS FIRST STORY</span><h2>{selectedCategory ? selectedCategory.name : 'No matching projects'}<br /><em>New concept coming soon.</em></h2><p>We’re building this part of the catalog carefully. For a custom direction, tell us what you have in mind.</p><Link to="/order" className="agency-button agency-button-dark">Discuss a custom website <ArrowUpRight size={15} /></Link></section>}
    </section>
  </main>
}

function DemoPage() {
  const { slug } = useParams()
  const { demos, loading, error } = useDemoCatalog()
  const project = demos.find((item) => item.slug === slug)

  if (loading) return <main className="project-detail-loading"><p>Loading project…</p></main>
  if (error || !project) return <NotFoundPage />

  const orderHref = `/order?website=${encodeURIComponent(project.name)}`
  const isOneBite = project.slug === 'onebite'

  return <main className="project-detail-page">
    <div className="detail-topline wrap"><Link to="/work"><ArrowLeft size={14} /> Work index</Link><span>LIVE WEBSITE / PROJECT {isOneBite ? '01' : '02'}</span><a href={project.live_url} target="_blank" rel="noopener noreferrer">Open live demo <ExternalLink size={14} /></a></div>
    <section className="detail-hero wrap">
      <div className="detail-hero-copy"><span className="editorial-kicker">{project.category} / DRAVIT SELECTED WORK</span><h1>{project.name}<span>.</span></h1><p>{project.description}</p><div className="detail-actions"><a href={project.live_url} target="_blank" rel="noopener noreferrer" className="agency-button agency-button-dark">View live website <ExternalLink size={14} /></a><Link to={orderHref} className="agency-button agency-button-outline">Choose this design <ArrowUpRight size={15} /></Link></div></div>
      <figure className="detail-cover" data-image-reveal><img src={project.preview_image} alt={`${project.name} imagery sourced from the live demo`} fetchPriority="high" /><figcaption>IMAGE SOURCED FROM THE LIVE DEMO · {project.name.toUpperCase()}</figcaption></figure>
    </section>
    <section className="detail-overview wrap" data-reveal><div><span className="editorial-kicker">PROJECT OVERVIEW / 01</span><h2>A digital home<br /><em>for a real business.</em></h2></div><div><p>{isOneBite ? 'OneBite is a family restaurant in Nehru Nagar, Bhopal. Its live site puts the menu, location, opening details, and phone-first enquiries in easy reach.' : 'Glam Up Salon & Makeup Studio is a beauty destination in Jahangirabad, Bhopal. Its live site introduces salon services, editorial beauty inspiration, location details, and call-led enquiries.'}</p><p className="detail-honesty">This is a live demonstration website, not a paid DRAVIT client case study. No project results or client outcomes are implied.</p></div></section>
    <section className="detail-highlights"><div className="wrap"><span className="editorial-kicker">DESIGN DIRECTION / 02</span><div className="detail-highlight-list">{project.highlights.map((highlight, index) => <div key={highlight}><span>0{index + 1}</span><strong>{highlight}</strong><ArrowUpRight size={15} /></div>)}</div></div></section>
    <section className="detail-device-previews wrap" data-reveal><div className="device-preview-heading"><div><span className="editorial-kicker">A CLOSER LOOK / 03</span><h2>One story.<br /><em>Every screen.</em></h2></div><p>The image is from the live website. For the full responsive experience, open the demo directly on desktop or mobile.</p></div><div className="device-preview-layout"><figure className="desktop-preview"><img src={project.preview_image} alt={`${project.name} desktop visual preview`} loading="lazy" /><figcaption>LIVE DEMO IMAGERY / DESKTOP VISUAL</figcaption></figure><figure className="mobile-preview"><div className="phone-frame"><span className="phone-speaker" /><img src={project.mobile_preview_image || project.preview_image} alt={`${project.name} mobile visual sample from the live site`} loading="lazy" /><span className="phone-home-indicator" /></div><figcaption>IMAGE STUDY / OPEN LIVE DEMO FOR MOBILE LAYOUT</figcaption></figure></div></section>
    <section className="detail-endcap"><div className="wrap"><span className="editorial-kicker">THE NEXT PROJECT / 04</span><h2>Make the next<br /><em>one yours.</em></h2><div className="detail-actions"><Link to={orderHref} className="agency-button agency-button-light">Choose this design <ArrowUpRight size={15} /></Link><a href={project.live_url} target="_blank" rel="noopener noreferrer" className="detail-endcap-link">View live website <ExternalLink size={14} /></a></div></div></section>
    <section className="related-work wrap"><span className="editorial-kicker">ALSO IN THE INDEX</span><div className="related-projects">{demos.filter((demo) => demo.slug !== project.slug).map((related, index) => <ProjectCard key={related.slug} project={related} index={index} />)}</div></section>
  </main>
}

function AboutPage() {
  return <main className="about-editorial wrap"><section className="about-intro" data-reveal><span className="editorial-kicker">ABOUT DRAVIT / AN INDEPENDENT STUDIO</span><h1>Small by design.<br /><em>Serious about the work.</em></h1><p>DRAVIT is a focused website design and development studio founded by DRAVIT NATERIYA. We bring strategy, design, and technology together to help ambitious businesses move forward online.</p></section><section className="about-founder" data-reveal><div className="founder-monogram-large">DN</div><div><span className="editorial-kicker">FOUNDER & CEO</span><h2>DRAVIT NATERIYA</h2><p>An independent practice built around close collaboration, clear thinking, and careful execution. No invented scale or borrowed credentials—just a direct relationship with the person shaping your project.</p><a href={`mailto:${email}`}>Write to the studio <ArrowUpRight size={15} /></a></div></section><section className="about-practice"><span className="editorial-kicker">THE PRACTICE / 01</span><p>Good digital work is not louder.<br /><em>It is more considered.</em></p><Link to="/services" className="agency-text-link">How we work <ArrowRight size={15} /></Link></section></main>
}

function ServicesPage() {
  const services = [
    ['01', 'Website design', 'A clear visual system and carefully structured experience, shaped around your business and audience.'],
    ['02', 'Website development', 'Responsive, accessible builds with the details cared for from first component through launch.'],
    ['03', 'E-commerce development', 'Product discovery, storefront design, and checkout flows made straightforward for customers.'],
    ['04', 'Landing page design', 'A focused page for a focused goal, from campaign launch to a new offer.'],
    ['05', 'Business websites', 'A considered online home for the services, people, and story behind your business.'],
    ['06', 'Website redesign', 'A thoughtful reset for a site that no longer reflects where the business is going.'],
    ['07', 'Website maintenance', 'Ongoing improvements and practical support to keep your website in good shape.'],
    ['08', 'Custom web applications', 'Purpose-built interfaces for workflows that need more than a standard website.'],
  ]
  return <main className="services-page"><section className="services-intro wrap" data-reveal><span className="editorial-kicker">SERVICES / STRATEGY · DESIGN · DEVELOPMENT</span><h1>Good thinking.<br /><em>Beautifully built.</em></h1><p>One direct studio relationship, from the first question to the details that make launch feel right.</p></section><section className="services-index wrap"><div className="services-index-heading"><span className="editorial-kicker">THE CAPABILITIES / 08</span><span>BUILT AROUND YOUR BRIEF</span></div>{services.map(([number, title, description]) => <article className="service-detail-row" key={number} data-reveal><span>{number}</span><h2>{title}</h2><p>{description}</p><ArrowUpRight size={17} /></article>)}</section><section className="services-cta"><div className="wrap"><span className="editorial-kicker">NO COOKIE-CUTTER PACKAGES</span><h2>Let’s start with<br /><em>what you need.</em></h2><p>We’ll scope the right approach together.</p><Link className="agency-button agency-button-light" to="/order">Start a project <ArrowUpRight size={15} /></Link></div></section></main>
}

const packages = [
  { name: 'The Essentials', note: 'A thoughtful first home on the web.', points: ['Discovery & direction', 'Custom one-page experience', 'Responsive development', 'Contact form & launch support'], detail: 'For a clear, confident introduction.' },
  { name: 'The Full Story', note: 'Room for the whole business to grow.', points: ['Strategy & content planning', 'Custom multi-page website', 'Responsive development', 'CMS setup & editor walkthrough', '30 days of launch support'], detail: 'For a business ready for its next chapter.', featured: true },
  { name: 'The Commerce', note: 'A storefront made for your customers.', points: ['E-commerce direction & design', 'Product and collection pages', 'Payment and shipping setup', 'Responsive development', 'Launch support & handover'], detail: 'For a considered online shop.' },
]

function PricingPage() {
  return <main className="studio-pricing wrap"><section className="studio-pricing-intro" data-reveal><span className="editorial-kicker">ENGAGEMENT / CLEAR SCOPE</span><h1>Thoughtful work.<br /><em>Transparent process.</em></h1><p>Every business is different, so we scope each project around what you actually need. These are starting points for a conversation, not fixed-price packages.</p></section><section className="pricing-index"><div className="pricing-index-head"><span className="editorial-kicker">COMMON ENGAGEMENTS / 03</span><span>SCOPED TO YOUR BRIEF</span></div>{packages.map((plan, index) => <article className="pricing-index-row" key={plan.name} data-reveal><span>0{index + 1}</span><div><h2>{plan.name}</h2><p>{plan.note}</p></div><ul>{plan.points.slice(0, 3).map((point) => <li key={point}>{point}</li>)}</ul><span className="pricing-custom-scope">Custom<br />proposal</span><Link to={`/order?package=${encodeURIComponent(plan.name)}`} aria-label={`Discuss ${plan.name}`}><ArrowUpRight size={18} /></Link></article>)}</section><div className="pricing-note"><p>Not sure which direction fits? Share what you are building and we will scope the right next step together.</p><Link to="/order" className="agency-button agency-button-dark">Start a project <ArrowUpRight size={15} /></Link></div></main>
}

function ContactPage() {
  const query = new URLSearchParams(window.location.search)
  const website = query.get('website') ?? ''
  const packageName = query.get('package') ?? ''
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    setSubmitting(true)
    setError('')
    try {
      const response = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.get('name'),
          email: formData.get('email'),
          business: formData.get('business'),
          website,
          package: packageName,
          details: formData.get('details'),
        }),
      })
      const result = await response.json() as { error?: string }
      if (!response.ok) throw new Error(result.error || 'We could not send your enquiry.')
      setSent(true)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'We could not send your enquiry.')
    } finally {
      setSubmitting(false)
    }
  }

  return <main className="contact-editorial"><section className="contact-editorial-intro wrap"><span className="editorial-kicker">CONTACT / A GOOD PROJECT STARTS HERE</span><h1>Tell us what<br /><em>you’re building.</em></h1><p>No pitch deck required. A few details are enough to start a useful conversation about your goals, audience, and next step.</p><div className="contact-direct"><span>OR WRITE DIRECTLY</span><a href={`mailto:${email}`}>{email} <ArrowUpRight size={15} /></a></div><div className="contact-owner"><span className="owner-avatar">DN</span><p><strong>DRAVIT NATERIYA</strong><br />Founder & CEO</p></div></section><section className="contact-editorial-form"><div className="wrap contact-editorial-grid"><div><span className="editorial-kicker">PROJECT ENQUIRY / PRIVATE TO THE STUDIO</span><p>Your enquiry is stored securely. Email notifications are sent when SMTP is configured by the site owner.</p></div><form className="contact-form agency-inquiry-form" onSubmit={handleSubmit}>{website && <div className="selected-project"><span>SELECTED DESIGN</span><strong>{website}</strong><Link to="/work">Change</Link></div>}{packageName && <div className="selected-project"><span>SELECTED ENGAGEMENT</span><strong>{packageName}</strong><Link to="/pricing">Change</Link></div>}<label>Your name<input autoComplete="name" name="name" placeholder="What should we call you?" required /></label><div className="form-row"><label>Email address<input autoComplete="email" name="email" type="email" placeholder="you@yourbusiness.com" required /></label><label>Business name<input autoComplete="organization" name="business" placeholder="Your business" /></label></div><label>Project details<textarea name="details" placeholder="What are you building? Who is it for? What would a good outcome look like?" rows={4} required /></label>{error && <p className="form-error" role="alert">{error}</p>}{sent && <p className="form-success" role="status">Your enquiry is safely stored. We’ll be in touch soon.</p>}<div className="form-submit-row"><button className="agency-button agency-button-dark" type="submit" disabled={submitting || sent}>{submitting ? 'Sending…' : sent ? 'Enquiry received' : 'Send project enquiry'} <ArrowUpRight size={16} /></button></div></form></div></section></main>
}

type AccountPageProps = { mode?: 'login' | 'register'; returnTo?: string; adminOnly?: boolean }

function AccountPage({ mode = 'login', returnTo = '/dashboard', adminOnly = false }: AccountPageProps) {
  const { signIn, register, user, error, clearError, loading } = useAuth()
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    if (!loading && user) navigate(returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/dashboard', { replace: true })
  }, [loading, navigate, returnTo, user])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    setSubmitting(true)
    setFormError('')
    clearError()
    try {
      if (mode === 'register') {
        await register(String(data.get('name')), String(data.get('email')), String(data.get('password')))
      } else {
        await signIn(String(data.get('email')), String(data.get('password')))
      }
    } catch (submitError) {
      setFormError(submitError instanceof Error ? submitError.message : error)
    } finally {
      setSubmitting(false)
    }
  }

  return <main className={`page-main wrap account-page${adminOnly ? ' admin-login-page' : ''}`}><section className="account-panel"><span className="admin-gate-icon"><ShieldCheck size={22} /></span><span className="eyebrow"><i /> {adminOnly ? 'DRAVIT TEAM' : 'YOUR PROJECT SPACE'}</span><h1>{mode === 'register' ? <>A good place<br /><em>to get started.</em></> : <>Welcome<br /><em>back.</em></>}</h1><p>{adminOnly ? 'Sign in with the administrator account configured by your site operator.' : mode === 'register' ? 'Create an account to manage your project, share requirements, and upload files privately.' : 'Sign in to see your projects and keep everything moving.'}</p><form className="account-form" onSubmit={handleSubmit}>{mode === 'register' && <label>Your name<input name="name" autoComplete="name" required minLength={2} maxLength={80} /></label>}<label>{mode === 'register' ? 'Email address' : 'Email or mobile number'}<input name="email" type={mode === 'register' ? 'email' : 'text'} inputMode={mode === 'register' ? 'email' : 'tel'} autoComplete={mode === 'register' ? 'email' : 'username'} placeholder={mode === 'register' ? 'you@example.com' : 'Email address or mobile number'} required maxLength={254} /></label><label>Password<input name="password" type="password" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} required minLength={mode === 'register' ? 12 : 1} maxLength={128} /></label>{formError && <p className="form-error" role="alert">{formError}</p>}{error && !formError && <p className="form-error" role="alert">{error}</p>}<button className="button button-primary" type="submit" disabled={submitting}>{submitting ? 'Please wait…' : mode === 'register' ? 'Create your account' : 'Sign in securely'} <ArrowRight size={16} /></button></form>{!adminOnly && <p className="account-switch">{mode === 'register' ? 'Already have an account?' : 'New to DRAVIT?'} <Link to={mode === 'register' ? `/login?next=${encodeURIComponent(returnTo)}` : `/register?next=${encodeURIComponent(returnTo)}`}>{mode === 'register' ? 'Sign in' : 'Create an account'}</Link></p>}<Link className="account-back" to="/">Back to the studio</Link></section></main>
}

type ProjectFile = { id: string; original_name: string; mime_type: string; byte_size: number; created_at: string }
type CustomerOrder = { id: string; business_name: string; website_name: string; package_name: string; project_type: string; requirements: string; status: string; created_at: string; files?: ProjectFile[] }

function CustomerDashboard() {
  const { user, loading, signOut } = useAuth()
  const [orders, setOrders] = useState<CustomerOrder[]>([])
  const [fetchError, setFetchError] = useState('')
  const [uploadingOrder, setUploadingOrder] = useState('')

  async function loadOrders() {
    const response = await fetch('/api/orders', { credentials: 'same-origin' })
    if (!response.ok) throw new Error('Your projects could not be loaded.')
    const data = await response.json() as { orders: CustomerOrder[] }
    setOrders(data.orders)
  }

  const reportLoadError = useEffectEvent((loadError: unknown) => {
    setFetchError(loadError instanceof Error ? loadError.message : 'Your projects could not be loaded.')
  })
  const refreshOrders = useEffectEvent(() => {
    void loadOrders().catch(reportLoadError)
  })

  useEffect(() => {
    if (!user) return
    // The state update occurs only after the asynchronous API response.
    // oxlint-disable-next-line react/set-state-in-effect
    refreshOrders()
  }, [user])

  async function uploadFiles(orderId: string, event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.currentTarget.files ?? [])
    event.currentTarget.value = ''
    if (!files.length) return
    setUploadingOrder(orderId)
    setFetchError('')
    try {
      for (const file of files) {
        const form = new FormData()
        form.append('file', file)
        const response = await fetch(`/api/orders/${orderId}/files`, { method: 'POST', body: form, credentials: 'same-origin' })
        if (!response.ok) {
          const message = await response.json() as { error?: string }
          throw new Error(message.error || `Could not upload ${file.name}.`)
        }
      }
      await loadOrders()
    } catch (uploadError) {
      setFetchError(uploadError instanceof Error ? uploadError.message : 'The files could not be uploaded.')
    } finally {
      setUploadingOrder('')
    }
  }

  if (loading) return <main className="page-main wrap"><p className="loading-note">Loading your project space…</p></main>
  if (!user) return <AccountPage returnTo="/dashboard" />

  return <main className="page-main wrap workspace-page"><div className="workspace-heading"><div><span className="eyebrow"><i /> YOUR DRAVIT SPACE</span><h1>Good to see you,<br /><em>{user.name.split(' ')[0]}.</em></h1><p>Your projects, updates, and shared files, all in one place.</p></div><div className="workspace-actions"><Link to="/order" className="button button-primary">Start a project <ArrowUpRight size={15} /></Link><button className="workspace-signout" type="button" onClick={() => void signOut()}>Sign out</button></div></div>{fetchError && <p className="form-error" role="alert">{fetchError}</p>}{orders.length === 0 ? <section className="empty-state"><span className="capability-icon"><Layers3 size={20} /></span><h2>Your next chapter starts here.</h2><p>When you start a project with DRAVIT, you’ll find its status and shared materials here.</p><Link className="button button-outline" to="/order">Create your first project order <ArrowRight size={15} /></Link></section> : <div className="customer-orders">{orders.map((order) => <article className="customer-order" key={order.id}><div className="order-card-heading"><div><span className="project-category">{order.project_type}</span><h2>{order.business_name}</h2></div><span className={`order-status status-${order.status}`}>{order.status.replaceAll('_', ' ')}</span></div><p className="order-card-meta">{order.website_name || 'Custom website'}{order.package_name ? ` · ${order.package_name}` : ''} · Submitted {new Date(order.created_at).toLocaleDateString()}</p><p className="order-requirements">{order.requirements}</p><div className="order-files"><span>PROJECT FILES · {order.files?.length ?? 0}</span>{order.files?.map((file) => <a href={`/api/files/${file.id}`} key={file.id}>{file.original_name} <ArrowUpRight size={13} /></a>)}</div><label className="upload-action">{uploadingOrder === order.id ? 'Uploading…' : 'Add project files'}<input type="file" multiple accept="image/png,image/jpeg,image/gif,image/webp,application/pdf,text/plain,text/csv,.docx,.xlsx" disabled={uploadingOrder === order.id} onChange={(event) => void uploadFiles(order.id, event)} /></label></article>)}</div>}</main>
}

function OrderPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const params = new URLSearchParams(window.location.search)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    setSubmitting(true)
    setError('')
    try {
      const response = await fetch('/api/orders', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin',
        body: JSON.stringify({
          businessName: data.get('businessName'), websiteName: data.get('websiteName'),
          packageName: data.get('packageName'), projectType: data.get('projectType'),
          requirements: data.get('requirements'), budget: data.get('budget'), desiredTimeline: data.get('desiredTimeline'),
        }),
      })
      const result = await response.json() as { error?: string; order?: { id: string } }
      if (!response.ok || !result.order) throw new Error(result.error || 'Your order could not be created.')
      const files = Array.from(data.getAll('files')).filter((file): file is File => file instanceof File && file.size > 0)
      for (const file of files) {
        const uploadForm = new FormData()
        uploadForm.append('file', file)
        const uploadResponse = await fetch(`/api/orders/${result.order.id}/files`, { method: 'POST', body: uploadForm, credentials: 'same-origin' })
        if (!uploadResponse.ok) {
          const uploadResult = await uploadResponse.json() as { error?: string }
          throw new Error(`Your order was saved, but ${file.name} was not uploaded: ${uploadResult.error || 'upload failed'}`)
        }
      }
      navigate('/dashboard')
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Your order could not be created.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!user) return <AccountPage returnTo={`${window.location.pathname}${window.location.search}`} />

  return <main className="page-main wrap order-page"><div className="page-intro"><span className="eyebrow"><i /> A GOOD PROJECT STARTS HERE</span><h1>Let's make<br /><em>something yours.</em></h1><p>Share a few details and we’ll come back with thoughtful next steps. Your project information stays private to your account and the DRAVIT team.</p></div><form className="order-form" onSubmit={handleSubmit}><div className="form-top"><span>PROJECT BRIEF</span><span>01 / NEW PROJECT</span></div>{params.get('website') && <div className="selected-project"><span>SELECTED CONCEPT</span><strong>{params.get('website')}</strong><Link to="/work">Change</Link></div>}<label>Business name<input name="businessName" autoComplete="organization" required minLength={2} maxLength={120} placeholder="Your business" /></label><div className="form-row"><label>Website concept<input name="websiteName" defaultValue={params.get('website') ?? ''} maxLength={120} placeholder="Custom or selected concept" /></label><label>Package<input name="packageName" defaultValue={params.get('package') ?? ''} maxLength={120} placeholder="We can decide together" /></label></div><div className="form-row"><label>Project type<select name="projectType" defaultValue="Business website"><option>Business website</option><option>Online store</option><option>Portfolio</option><option>Landing page</option><option>Website refresh</option><option>Other</option></select></label><label>Desired timeline<input name="desiredTimeline" maxLength={120} placeholder="e.g. this autumn" /></label></div><label>Budget range<select name="budget" defaultValue=""><option value="">Prefer to discuss</option><option>Under $2,500</option><option>$2,500–$5,000</option><option>$5,000–$10,000</option><option>$10,000+</option></select></label><label>Project requirements<textarea name="requirements" rows={5} required minLength={20} maxLength={10000} placeholder="What should the website help you do? Who is it for? What would a great outcome look like?" /></label><label className="file-picker">Project files <span>Up to 10 MB per file. Images, PDF, TXT, CSV, DOCX, XLSX.</span><input type="file" name="files" multiple accept="image/png,image/jpeg,image/gif,image/webp,application/pdf,text/plain,text/csv,.docx,.xlsx" /></label>{error && <p className="form-error" role="alert">{error}</p>}<div className="form-submit-row"><button className="button button-primary" type="submit" disabled={submitting}>{submitting ? 'Sending your brief…' : 'Submit project brief'} <ArrowUpRight size={16} /></button><span>PRIVATE TO YOUR ACCOUNT.</span></div></form></main>
}

type AdminOrder = CustomerOrder & { customer_name: string; customer_email: string; updated_at: string }

function AdminWorkspace() {
  const [summary, setSummary] = useState({ customers: 0, orders: 0, visitors: 0, demoViews: 0, inquiries: 0 })
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [customers, setCustomers] = useState<Array<{ id: string; name: string; email: string; order_count: number; created_at: string }>>([])
  const [error, setError] = useState('')

  useEffect(() => {
    void Promise.all([
      fetch('/api/admin/summary').then((response) => response.json()),
      fetch('/api/admin/orders').then((response) => response.json()),
      fetch('/api/admin/customers').then((response) => response.json()),
    ]).then(([summaryData, orderData, customerData]) => {
      setSummary(summaryData)
      setOrders(orderData.orders)
      setCustomers(customerData.customers)
    }).catch(() => setError('The admin workspace could not be loaded.'))
  }, [])

  async function updateStatus(orderId: string, status: string) {
    const response = await fetch(`/api/admin/orders/${orderId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
    })
    if (!response.ok) {
      setError('The order status could not be updated.')
      return
    }
    setOrders((current) => current.map((order) => order.id === orderId ? { ...order, status } : order))
  }

  return <main className="page-main wrap admin-workspace"><div className="workspace-heading"><div><span className="eyebrow"><i /> DRAVIT STUDIO</span><h1>Good work,<br /><em>well looked after.</em></h1><p>A private view of customers, project orders, and the work in motion.</p></div><span className="admin-private"><ShieldCheck size={15} /> ADMIN ACCESS</span></div>{error && <p className="form-error" role="alert">{error}</p>}<div className="admin-metrics"><div><span>CUSTOMERS</span><strong>{summary.customers}</strong></div><div><span>PROJECT ORDERS</span><strong>{summary.orders}</strong></div><div><span>VISITORS</span><strong>{summary.visitors}</strong></div><div><span>DEMO VIEWS</span><strong>{summary.demoViews}</strong></div><div><span>ENQUIRIES</span><strong>{summary.inquiries}</strong></div></div><section className="admin-section"><div className="admin-section-heading"><div><span className="eyebrow"><i /> THE PIPELINE</span><h2>Project orders</h2></div><span>{orders.length} TOTAL</span></div>{orders.length === 0 ? <p className="admin-empty">New project orders will appear here.</p> : <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>BUSINESS</th><th>CUSTOMER</th><th>PROJECT</th><th>SUBMITTED</th><th>STATUS</th></tr></thead><tbody>{orders.map((order) => <tr key={order.id}><td><strong>{order.business_name}</strong><span>{order.website_name || order.project_type}</span></td><td><strong>{order.customer_name}</strong><a href={`mailto:${order.customer_email}`}>{order.customer_email}</a></td><td>{order.package_name || 'Custom scope'}</td><td>{new Date(order.created_at).toLocaleDateString()}</td><td><select aria-label={`Status for ${order.business_name}`} value={order.status} onChange={(event) => void updateStatus(order.id, event.target.value)}><option value="received">Received</option><option value="reviewing">Reviewing</option><option value="in_progress">In progress</option><option value="waiting_on_customer">Waiting on customer</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></td></tr>)}</tbody></table></div>}</section><section className="admin-section"><div className="admin-section-heading"><div><span className="eyebrow"><i /> RELATIONSHIPS</span><h2>Customers</h2></div><span>{customers.length} TOTAL</span></div>{customers.length === 0 ? <p className="admin-empty">Customer registrations will appear here.</p> : <div className="customer-list">{customers.map((customer) => <div className="customer-list-row" key={customer.id}><span className="owner-avatar">{customer.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</span><div><strong>{customer.name}</strong><a href={`mailto:${customer.email}`}>{customer.email}</a></div><span>{customer.order_count} PROJECTS</span><time>{new Date(customer.created_at).toLocaleDateString()}</time></div>)}</div>}</section><section className="admin-section admin-handoff"><span className="eyebrow"><i /> SITE ACTIVITY</span><h2>Analytics snapshot</h2><p>{summary.visitors} unique visitor IDs · {summary.demoViews} concept views. Analytics are first-party, anonymous IDs and contain no contact details.</p></section></main>
}

type AdminInquiry = { id: string; name: string; email: string; business_name: string; website_name: string; package_name: string; details: string; created_at: string }
type PopularDemo = { slug: string; views: number }

function AdminInsights() {
  const [inquiries, setInquiries] = useState<AdminInquiry[]>([])
  const [popularDemos, setPopularDemos] = useState<PopularDemo[]>([])

  useEffect(() => {
    void Promise.all([
      fetch('/api/admin/inquiries').then((response) => response.json()),
      fetch('/api/admin/analytics').then((response) => response.json()),
    ]).then(([inquiryData, analyticsData]) => {
      setInquiries(inquiryData.inquiries)
      setPopularDemos(analyticsData.popularDemos)
    }).catch(() => undefined)
  }, [])

  return <div className="wrap admin-extra-panels"><section className="admin-section"><div className="admin-section-heading"><div><span className="eyebrow"><i /> INTEREST</span><h2>Recent enquiries</h2></div><span>{inquiries.length} SHOWN</span></div>{inquiries.length === 0 ? <p className="admin-empty">New enquiries will appear here.</p> : <div className="inquiry-list">{inquiries.map((inquiry) => <article className="inquiry-item" key={inquiry.id}><div className="inquiry-heading"><div><strong>{inquiry.name}</strong><a href={`mailto:${inquiry.email}`}>{inquiry.email}</a></div><time>{new Date(inquiry.created_at).toLocaleDateString()}</time></div><p>{inquiry.details}</p><span>{[inquiry.business_name, inquiry.website_name, inquiry.package_name].filter(Boolean).join(' · ') || 'General enquiry'}</span></article>)}</div>}</section><section className="admin-section"><div className="admin-section-heading"><div><span className="eyebrow"><i /> WHAT PEOPLE EXPLORE</span><h2>Popular concepts</h2></div><span>ALL-TIME VIEWS</span></div>{popularDemos.length === 0 ? <p className="admin-empty">Concept views will appear here as people explore.</p> : <div className="popular-demo-list">{popularDemos.map((demo, index) => <div className="popular-demo-row" key={demo.slug}><span>{String(index + 1).padStart(2, '0')}</span><strong>{demo.slug.split('-').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}</strong><div><i style={{ width: `${Math.max(8, demo.views / Math.max(...popularDemos.map((item) => item.views)) * 100)}%` }} /></div><span>{demo.views}</span></div>)}</div>}</section></div>
}

function AdminPage() {
  const { user, loading, signOut } = useAuth()
  if (loading) return <main className="page-main wrap"><p className="loading-note">Checking administrator access…</p></main>
  if (!user) return <AccountPage returnTo="/admin" adminOnly />
  if (user.role !== 'admin') return <main className="page-main wrap admin-page"><div className="admin-gate"><span className="admin-gate-icon"><ShieldCheck size={24} /></span><span className="eyebrow"><i /> ACCESS RESTRICTED</span><h1>Not your<br /><em>workspace.</em></h1><p>This area is limited to DRAVIT administrators.</p><button className="button button-outline" type="button" onClick={() => void signOut()}>Sign out <ArrowRight size={15} /></button></div></main>
  return <><AdminWorkspace /><AdminInsights /></>
}

function NotFoundPage() {
  return <main className="page-main wrap not-found"><span className="eyebrow"><i /> PAGE NOT FOUND</span><h1>This page took<br /><em>a different route.</em></h1><Link className="button button-primary" to="/">Back to DRAVIT <ArrowRight size={15} /></Link></main>
}

function AnalyticsTracker() {
  const location = useLocation()

  useEffect(() => {
    try {
      let visitorId = sessionStorage.getItem('dravit_visitor')
      if (!visitorId) {
        visitorId = crypto.randomUUID()
        sessionStorage.setItem('dravit_visitor', visitorId)
      }
      const demoSlug = location.pathname.startsWith('/demo/') ? location.pathname.slice('/demo/'.length) : undefined
      void fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitorId,
          eventType: demoSlug ? 'demo_view' : 'page_view',
          pagePath: location.pathname,
          projectSlug: demoSlug,
        }),
        keepalive: true,
      }).catch(() => undefined)
    } catch {
      // Private browsing modes may disable session storage.
    }
  }, [location.pathname])

  return null
}

function RoutedApp() {
  const location = useLocation()
  const pageRoot = useRef<HTMLDivElement>(null)
  useAgencyMotion(pageRoot, location.pathname)

  return (
    <div className="app-shell agency-shell" ref={pageRoot} id="top">
      <Header />
      <div key={location.pathname} className="route-stage">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/work" element={<WorkPage />} />
          <Route path="/demo/:slug" element={<DemoPage />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/login" element={<AccountPage returnTo={new URLSearchParams(location.search).get('next') || '/dashboard'} />} />
          <Route path="/register" element={<AccountPage mode="register" returnTo={new URLSearchParams(location.search).get('next') || '/dashboard'} />} />
          <Route path="/dashboard" element={<CustomerDashboard />} />
          <Route path="/order" element={<OrderPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </div>
      <AnalyticsTracker />
      <Footer />
    </div>
  )
}

export default function App() {
  return <BrowserRouter><AuthProvider><RoutedApp /></AuthProvider></BrowserRouter>
}
