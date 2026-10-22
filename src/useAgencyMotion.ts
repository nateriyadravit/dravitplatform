import { useEffect, type RefObject } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export function useAgencyMotion(rootRef: RefObject<HTMLElement | null>, routeKey: string) {
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const navigation = root.querySelector<HTMLElement>('.agency-nav')
    const progressBar = root.querySelector<HTMLElement>('.agency-scroll-progress')
    const updateNavigation = () => {
      navigation?.classList.toggle('is-scrolled', window.scrollY > 26)
      const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight
      const progress = scrollableHeight > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollableHeight)) : 0
      progressBar?.style.setProperty('--scroll-progress', String(progress))
    }
    window.addEventListener('scroll', updateNavigation, { passive: true })
    updateNavigation()

    if (reducedMotion) {
      return () => window.removeEventListener('scroll', updateNavigation)
    }

    const pointerCleanups: Array<() => void> = []
    const context = gsap.context(() => {
      const hero = root.querySelector<HTMLElement>('[data-agency-hero]')
      if (hero) {
        const entrance = gsap.timeline({ defaults: { ease: 'power3.out' } })
        entrance.fromTo('.agency-nav', { y: -12, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: .55 })
          .fromTo('[data-hero-eyebrow]', { y: 12, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: .45 }, '-=.2')
          .fromTo('.hero-line-inner', { yPercent: 108 }, { yPercent: 0, duration: .82, stagger: .09 }, '-=.14')
          .fromTo('[data-hero-copy]', { y: 16, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: .52 }, '-=.3')
          .fromTo('[data-hero-actions]', { y: 12, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: .42 }, '-=.28')
          .fromTo('[data-hero-art]', { clipPath: 'inset(0 0 100% 0)', scale: 1.035 }, { clipPath: 'inset(0 0 0% 0)', scale: 1, duration: .95 }, '-=.68')

        const art = hero.querySelector<HTMLElement>('.agency-hero-art')
        if (art && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
          const handlePointerMove = (event: PointerEvent) => {
            const bounds = art.getBoundingClientRect()
            const x = Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width))
            const y = Math.min(1, Math.max(0, (event.clientY - bounds.top) / bounds.height))
            art.style.setProperty('--pointer-x', `${x * 100}%`)
            art.style.setProperty('--pointer-y', `${y * 100}%`)
            art.style.setProperty('--tilt-x', `${(0.5 - y) * 5}deg`)
            art.style.setProperty('--tilt-y', `${(x - 0.5) * 7}deg`)
          }
          const resetPointer = () => {
            art.style.removeProperty('--pointer-x')
            art.style.removeProperty('--pointer-y')
            art.style.removeProperty('--tilt-x')
            art.style.removeProperty('--tilt-y')
          }
          art.addEventListener('pointermove', handlePointerMove)
          art.addEventListener('pointerleave', resetPointer)
          pointerCleanups.push(() => {
            art.removeEventListener('pointermove', handlePointerMove)
            art.removeEventListener('pointerleave', resetPointer)
            resetPointer()
          })
        }
      }

      root.querySelectorAll<HTMLElement>([
        '[data-reveal]',
        'main > :not([data-horizontal-showcase])',
        'main .services-index > *',
        'main .pricing-index > *',
        'main .process-list > *',
      ].join(',')).forEach((element) => {
        gsap.fromTo(element, { y: 30, autoAlpha: 0 }, {
          y: 0,
          autoAlpha: 1,
          duration: .72,
          ease: 'power2.out',
          scrollTrigger: { trigger: element, start: 'top 86%', once: true },
        })
      })

      root.querySelectorAll<HTMLElement>('[data-image-reveal]').forEach((element) => {
        gsap.fromTo(element, { clipPath: 'inset(0 0 100% 0)' }, {
          clipPath: 'inset(0 0 0% 0)',
          duration: .95,
          ease: 'power2.inOut',
          scrollTrigger: { trigger: element, start: 'top 84%', once: true },
        })
        const image = element.querySelector<HTMLElement>('img')
        if (image) {
          gsap.to(image, {
            yPercent: -3,
            scale: 1.06,
            ease: 'none',
            scrollTrigger: { trigger: element, start: 'top bottom', end: 'bottom top', scrub: .7 },
          })
        }
      })

      root.querySelectorAll<HTMLElement>('.process-step').forEach((step) => {
        ScrollTrigger.create({
          trigger: step,
          start: 'top 58%',
          end: 'bottom 42%',
          onEnter: () => step.classList.add('is-active'),
          onEnterBack: () => step.classList.add('is-active'),
          onLeave: () => step.classList.remove('is-active'),
          onLeaveBack: () => step.classList.remove('is-active'),
        })
      })

      const motion = gsap.matchMedia()
      motion.add('(min-width: 900px) and (prefers-reduced-motion: no-preference)', () => {
        const showcase = root.querySelector<HTMLElement>('[data-horizontal-showcase]')
        const track = showcase?.querySelector<HTMLElement>('.showcase-track')
        if (!showcase || !track) return
        const horizontalTween = gsap.to(track, {
          x: () => Math.min(0, window.innerWidth - track.scrollWidth - 48),
          ease: 'none',
          scrollTrigger: {
            trigger: showcase,
            start: () => `top top+=${Math.ceil(navigation?.getBoundingClientRect().height ?? 84)}`,
            end: () => `+=${Math.max(480, track.scrollWidth - window.innerWidth + 64)}`,
            pin: true,
            scrub: .65,
            invalidateOnRefresh: true,
          },
        })
        const resizeObserver = new ResizeObserver(() => ScrollTrigger.refresh())
        resizeObserver.observe(track)
        return () => {
          resizeObserver.disconnect()
          horizontalTween.scrollTrigger?.kill()
        }
      })
      return () => {
        pointerCleanups.forEach((cleanup) => cleanup())
        motion.revert()
      }
    }, root)

    return () => {
      window.removeEventListener('scroll', updateNavigation)
      context.revert()
    }
  }, [rootRef, routeKey])
}
