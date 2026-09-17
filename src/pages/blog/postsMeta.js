const posts = [
  {
    slug: "lucidhover",
    title: "LucidHover: hovering a function shouldn't mean reading it in isolation",
    summary: "Building a VS Code extension that explains any function in the context of the whole repo (role, callers/callees, blast radius) using a fully local LLM through Ollama.",
    tags: ["Agentic AI", "VS Code", "Local LLM"],
  },
  {
    slug: "codebase-deobfuscator",
    title: "Teaching a local model to deobfuscate JavaScript, one rename at a time",
    summary: "A reusable agentic-workflow harness proven out on JS deobfuscation: a rename-map-only LLM contract, Docker-sandboxed equivalence testing, and a real dspy.GEPA prompt-optimization loop.",
    tags: ["Agentic AI", "DSPy/GEPA", "Local LLM"],
  },
  {
    slug: "pokemon-showdown-bot",
    title: "Falsifying my own hypothesis: search beats the net I built to help it",
    summary: "Building a competitive Pokémon Showdown bot (from-scratch RL, then a pretrained transformer prior, then determinized MCTS) and the controlled A/B tests that killed the hybrid idea I set out to prove.",
    tags: ["Reinforcement Learning", "MCTS", "A/B Testing"],
  },
  {
    slug: "pokerogue-bot",
    title: "Building an autonomous PokéRogue player, from architecture to a full Classic clear",
    summary: "A heuristic-driven agent that plays PokéRogue's 200-wave Classic run inside the live game: its own decision loop, a swappable LLM layer, and the wins that actually shipped.",
    tags: ["Agent Architecture", "Heuristic Planning", "Local LLM"],
  },
  {
    slug: "siem-guard",
    title: "SIEM Guard: what a local-LLM SIEM pipeline gets right, gets wrong, and the number that was never real",
    summary: "A local, LLM-assisted SIEM pipeline (parsing, behavioral anomaly detection, supply-chain checks, adversarial self-testing), and the honest 6-part validation series that found a fabricated metric hiding in plain sight.",
    tags: ["Security", "LLM Pipelines", "Validation"],
  },
];

export default posts;
