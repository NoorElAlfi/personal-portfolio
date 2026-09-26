import React from "react";
import Section from "./Section";
import Card from "./Card";
import RichText from "../lib/richText";
import { nowItems } from "../data/now";

function CurrentlyExploring() {
  return (
    <Section
      id="currently-exploring"
      title="Currently Exploring"
      subtitle="Active curiosity, not claimed expertise: things I'm reading about and tinkering with right now."
    >
      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {nowItems.map((item) => (
          <Card key={item.id} className="border-dashed">
            <h3 className="font-semibold text-brand-600 dark:text-brand-400">
              {item.title}
            </h3>
            <p className="mt-2 text-slate-600 dark:text-slate-300">
              <RichText text={item.description} />
            </p>
          </Card>
        ))}
      </div>
    </Section>
  );
}

export default CurrentlyExploring;
