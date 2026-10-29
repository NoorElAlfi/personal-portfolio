import React from 'react';
import Hero from '../components/Hero';
import Education from '../components/Education';
import Skills from '../components/Skills';
import Experience from '../components/Experience';
import Projects from '../components/Projects';
import MoreProjects from '../components/MoreProjects';
import Faq from '../components/Faq';
import CurrentlyExploring from '../components/CurrentlyExploring';
import useDocumentTitle from '../lib/useDocumentTitle';
import { HOME_TITLE } from '../lib/siteMeta';

// Order: who I am, what I built and the result, where I did it, the rest, and the collapsed Hiring FAQ last.
function Home() {
  useDocumentTitle(HOME_TITLE);
  return (
    <>
      <Hero />
      <Projects />
      <Experience />
      <MoreProjects />
      <Skills />
      <Education />
      <CurrentlyExploring />
      <Faq />
    </>
  );
}

export default Home;
