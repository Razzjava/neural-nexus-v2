#!/usr/bin/env node

/**
 * Manifestation Reminder Generator
 * 
 * Rotates through different manifestation statements
 * to keep the feeling fresh and help things click
 */

const REMINDERS = [
  // State-based (the wish fulfilled)
  {
    type: "state",
    text: "Feel yourself standing up from that first class seat. The wealth, the ease, the freedom. It's done."
  },
  {
    type: "state", 
    text: "You're already there. The millionaire version of you is reading this right now. Feel it."
  },
  {
    type: "state",
    text: "The money is already in your account. The deal is already closed. The success is already yours. Feel the relief."
  },
  {
    type: "state",
    text: "You're not trying to become wealthy. You ARE wealthy. Right now. In this moment. Feel it true."
  },
  
  // Feeling-based (emotional state)
  {
    type: "feeling",
    text: "Feel the security. The bills are paid. The future is handled. Everything you touch turns to gold."
  },
  {
    type: "feeling",
    text: "That feeling when you check your account and see more than enough. Feel that now."
  },
  {
    type: "feeling",
    text: "The deep peace of knowing you're taken care of. Forever. Feel that peace right now."
  },
  {
    type: "feeling",
    text: "The excitement of buying whatever you want without checking the price. Feel that freedom."
  },
  
  // Identity-based (who you are)
  {
    type: "identity",
    text: "You are the source of wealth. Money flows to you effortlessly. You are the millionaire."
  },
  {
    type: "identity",
    text: "You don't chase money. Money chases you. You are magnetic to abundance."
  },
  {
    type: "identity",
    text: "You are the person who makes money while sleeping. While eating. While breathing. It's who you are."
  },
  {
    type: "identity",
    text: "Wealth isn't something you do. It's someone you are. And you are already that person."
  },
  
  // Perspective-based (seeing differently)
  {
    type: "perspective",
    text: "Stop looking for signs that it's working. The sign is that you're looking. You're already there."
  },
  {
    type: "perspective",
    text: "The old you waited for proof. The new you knows. Which one are you being right now?"
  },
  {
    type: "perspective",
    text: "Your current reality is just the old manifestation catching up. The new one is already done."
  },
  {
    type: "perspective",
    text: "You don't need to figure out how. The how is none of your business. The feeling is everything."
  },
  
  // Action-based (what the wealthy you does)
  {
    type: "action",
    text: "The millionaire you tips generously. Orders without looking at prices. Gives freely. Be that now."
  },
  {
    type: "action",
    text: "What would you do right now if you had ten million in the bank? Go do that in your imagination."
  },
  {
    type: "action",
    text: "Wealthy you walks differently. Talks differently. Feels different. Step into that version now."
  },
  
  // Short & punchy (quick hits)
  {
    type: "quick",
    text: "It's done."
  },
  {
    type: "quick",
    text: "You are already wealthy."
  },
  {
    type: "quick",
    text: "Feel it real."
  },
  {
    type: "quick",
    text: "The money is yours."
  },
  {
    type: "quick",
    text: "Abundance is your nature."
  },
  
  // Neville Goddard inspired
  {
    type: "neville",
    text: "Assume the feeling of the wish fulfilled. That's the secret. Feel it now."
  },
  {
    type: "neville",
    text: "Your assumption, though false, if persisted in, will harden into fact. Persist in the feeling of wealth."
  },
  {
    type: "neville",
    text: "Imagining creates reality. What are you imagining right now? Make it the end result."
  },
  {
    type: "neville",
    text: "The world is yourself pushed out. Change your concept of self and the world changes. You are wealthy."
  },
  
  // Specific scenarios (vivid imagery)
  {
    type: "scenario",
    text: "You're at the dealership. The car you want is right there. You pull out your card without a second thought. Feel that."
  },
  {
    type: "scenario",
    text: "The notification pops up. Another five figures deposited. You smile and keep doing what you love. Feel that normal."
  },
  {
    type: "scenario",
    text: "You're booking the trip. First class. The best suite. Because why not? You're wealthy. Feel that ease."
  },
  {
    type: "scenario",
    text: "Your family asks for help. You transfer the money instantly. No stress. No worry. Just love and abundance. Feel that."
  }
];

class ManifestationRotator {
  constructor() {
    this.reminders = REMINDERS;
    this.usedIndices = new Set();
  }
  
  /**
   * Get a random reminder, avoiding recent repeats
   */
  getReminder() {
    // If we've used all, reset
    if (this.usedIndices.size >= this.reminders.length - 5) {
      this.usedIndices.clear();
    }
    
    // Get available indices
    const available = this.reminders
      .map((_, i) => i)
      .filter(i => !this.usedIndices.has(i));
    
    // Pick random
    const randomIndex = available[Math.floor(Math.random() * available.length)];
    this.usedIndices.add(randomIndex);
    
    return this.reminders[randomIndex];
  }
  
  /**
   * Get reminder by type
   */
  getByType(type) {
    const ofType = this.reminders.filter(r => r.type === type);
    return ofType[Math.floor(Math.random() * ofType.length)];
  }
  
  /**
   * Get all types available
   */
  getTypes() {
    return [...new Set(this.reminders.map(r => r.type))];
  }
  
  /**
   * Get count
   */
  getCount() {
    return this.reminders.length;
  }
}

// Export for use in other modules
module.exports = new ManifestationRotator();

// If run directly, show sample
if (require.main === module) {
  const rotator = new ManifestationRotator();
  console.log('🎯 Manifestation Reminder Rotator\n');
  console.log(`Total reminders: ${rotator.getCount()}`);
  console.log(`Types: ${rotator.getTypes().join(', ')}\n`);
  console.log('Sample reminders:\n');
  
  for (let i = 0; i < 5; i++) {
    const reminder = rotator.getReminder();
    console.log(`[${reminder.type.toUpperCase()}]`);
    console.log(`${reminder.text}\n`);
  }
}
