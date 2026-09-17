import React from 'react';
import Section from './Section';
import Card from './Card';

const items = [
  {
    title: 'Embedded Systems',
    description:
      'Genuine early-stage curiosity, not professional experience: an Arduino RFID reader/writer (MFRC522 over SPI), and a Basys3 FPGA + Raspberry Pi home-security project.',
  },
  {
    title: 'AI Safety & Security',
    description:
      "Where adversarial ML and cyber-operations research meet: continuing the jailbreak/red-teaming work from Scale AI, the autonomous cyber-agent \"gym\" research from the EMU thesis, and a new project idea: a local tool that reads a coding agent's full session, not one tool call at a time, and flags multi-step attack-shaped sequences and goal drift, the way a SOC analyst reviews a session log rather than approving commands one by one.",
  },
  {
    title: 'Self-Supervised Learning (JEPA)',
    description:
      "Learning Joint-Embedding Predictive Architectures and starting a new project applying one to compression: training a model to predict compression ratio and classify codec directly from learned embeddings, across multiple compression algorithms.",
  },
];

function CurrentlyExploring() {
  return (
    <Section id="currently-exploring" title="Currently Exploring" subtitle="Active curiosity, not claimed expertise: things I'm reading about and tinkering with right now.">
      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <Card key={item.title} className="border-dashed">
            <h3 className="font-semibold text-brand-600 dark:text-brand-400">{item.title}</h3>
            <p className="mt-2 text-slate-600 dark:text-slate-300">{item.description}</p>
          </Card>
        ))}
      </div>
    </Section>
  );
}

export default CurrentlyExploring;
