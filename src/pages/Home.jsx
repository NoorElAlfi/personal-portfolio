import React from 'react';
import Hero from '../components/Hero';
import Education from '../components/Education';
import Skills from '../components/Skills';
import Experience from '../components/Experience';
import Projects from '../components/Projects';
import CurrentlyExploring from '../components/CurrentlyExploring';

function Home() {
  return (
    <>
      <Hero />
      <Education />
      <Skills />
      <Experience />
      <Projects />
      <CurrentlyExploring />
    </>
  );
}

export default Home;
