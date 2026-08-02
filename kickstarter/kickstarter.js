import './kickstarter-base.js?v=20260802-core-copy';

(function(){
  'use strict';

  const ENERGY_COPY = {
    RED: {
      label: 'RED · BODY',
      headline: 'What makes you feel and move?',
      body: 'Desire, Joy, Taste, Passion, Courage, Warmth and Celebration — the living energy that lets you feel, want and act.'
    },
    BLUE: {
      label: 'BLUE · MIND',
      headline: 'What helps you see and choose?',
      body: 'Clarity, Perspective, Wisdom, Curiosity, Strategy, Reflection and Choice — the mind that turns noise into direction.'
    },
    GREEN: {
      label: 'GREEN · SOUL',
      headline: 'What helps you care, endure and become?',
      body: 'Discipline, Consistency, Balance, Patience, Care, Recovery and Commitment — the inner roots that let a life keep growing.'
    },
    GRAY: {
      label: 'GRAY · CRAFT',
      headline: 'What helps you turn meaning into reality?',
      body: 'Observe, Measure, Build, Repair, Connect, Adapt and Iterate — the craft that gives intention a form the world can use.'
    }
  };

  function setText(selector, value){
    const node = document.querySelector(selector);
    if(node) node.textContent = value;
  }

  function applyCampaignCopy(){
    const og = document.querySelector('meta[property="og:description"]');
    if(og) og.setAttribute('content', 'One deck. Any opponent. Anywhere. Learn in ten seconds, carry seven cards, and play with the world.');

    setText('.hero-lead', 'A beautiful 32-card box that lets you open a real game with anyone in ten seconds — even if they do not own a deck, know the rules, or speak the same language.');
    setText('.micro-proof', '28 energy cards · 4 rule cards · 10-second teach · 1 deck for the whole table');

    const promise = document.querySelector('#promise .promise-grid article:first-child strong');
    if(promise) promise.textContent = '10 sec';

    const labels = {
      RED: 'RED · BODY',
      BLUE: 'BLUE · MIND',
      GREEN: 'GREEN · SOUL',
      GRAY: 'GRAY · CRAFT'
    };

    document.querySelectorAll('.energy-button').forEach(button => {
      const energy = button.dataset.energy;
      if(labels[energy]) button.innerHTML = '<span>●</span> ' + labels[energy];
    });

    const heading = document.querySelector('.language .section-heading h2');
    if(heading) heading.innerHTML = 'Four colors. Four parts of being human.<br><em>Body. Mind. Soul. Craft.</em>';

    const active = document.querySelector('.energy-button.active') || document.querySelector('.energy-button');
    if(active) applyEnergy(active.dataset.energy);
  }

  function applyEnergy(energy){
    const copy = ENERGY_COPY[energy];
    if(!copy) return;
    setText('#energyLabel', copy.label);
    setText('#energyHeadline', copy.headline);
    setText('#energyBody', copy.body);
  }

  document.addEventListener('DOMContentLoaded', function(){
    applyCampaignCopy();

    document.querySelectorAll('.energy-button').forEach(button => {
      button.addEventListener('click', function(){
        window.setTimeout(function(){ applyEnergy(button.dataset.energy); }, 0);
      });
    });
  });
})();
