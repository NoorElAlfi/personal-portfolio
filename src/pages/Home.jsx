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

// Order: who I am, what I built and the result, where I did it, the usual first questions, then the rest.
function Home() {
  useDocumentTitle(HOME_TITLE);
  return (
    <>
      <Hero />
      <Projects />
      <Experience />
      <Faq />
      <MoreProjects />
      <Skills />
      <Education />
      <CurrentlyExploring />
    </>
  );
}

export default Home;
