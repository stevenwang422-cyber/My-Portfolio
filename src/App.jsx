import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import { useGSAP } from '@gsap/react'
import Lenis from 'lenis'

import { ScrollContext } from './lib/ScrollContext.js'
import Preloader from './components/Preloader.jsx'
import Navbar from './components/Navbar.jsx'
import Hero from './components/Hero.jsx'
import About from './components/About.jsx'
import Experience from './components/Experience.jsx'
import Work from './components/Work.jsx'
import Clients from './components/Clients.jsx'
import Manifesto from './components/Manifesto.jsx'
import Contact from './components/Contact.jsx'

gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP)

export default function App() {
  const [started, setStarted] = useState(false)
  const lenisRef = useRef(null)

  // Smooth scrolling, driven by GSAP's ticker so ScrollTrigger stays in sync
  useEffect(() => {
    const lenis = new Lenis({ duration: 1.1 })
    lenisRef.current = lenis
    lenis.stop() // locked until the preloader reveals the page

    lenis.on('scroll', ScrollTrigger.update)
    const raf = (time) => lenis.raf(time * 1000)
    gsap.ticker.add(raf)
    gsap.ticker.lagSmoothing(0)

    document.fonts.ready.then(() => ScrollTrigger.refresh())

    return () => {
      gsap.ticker.remove(raf)
      lenis.destroy()
    }
  }, [])

  useEffect(() => {
    if (started) lenisRef.current?.start()
  }, [started])

  // Generic scroll-in reveal for anything tagged data-reveal
  useGSAP(() => {
    gsap.utils.toArray('[data-reveal]').forEach((el) => {
      gsap.fromTo(
        el,
        { y: 48, autoAlpha: 0 },
        {
          y: 0,
          autoAlpha: 1,
          duration: 1,
          ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 88%' },
        }
      )
    })
  })

  const scrollTo = (target) => lenisRef.current?.scrollTo(target)

  return (
    <ScrollContext.Provider value={scrollTo}>
      <Preloader onReveal={() => setStarted(true)} />
      <Navbar started={started} />
      <main>
        <Hero started={started} />
        <About />
        <Clients />
        <Experience />
        <Work />
        <Manifesto />
        <Contact />
      </main>
    </ScrollContext.Provider>
  )
}
