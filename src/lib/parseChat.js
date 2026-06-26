export function parseWhatsAppChat(text) {
  const lines = text.split("\n");
  const messageRegex =
    /^(\d{1,2}\/\d{1,2}\/\d{2,4}),\s(\d{1,2}:\d{2}(?::\d{2})?(?:\s?[aApP][mM])?)\s-\s([^:]+):\s(.+)$/;

  const stats = {};
  const hourCounts = Array(24).fill(0);
  const dateCounts = {};
  let totalMessages = 0;
  let lastSender = null;
  let lastTime = null;
  const responseTimes = {};
  const slangWords = new Set([
    "lol","lmao","omg","wtf","bruh","bro","sis","fam","lit","vibe",
    "slay","cap","nocap","bussin","goat","lowkey","highkey","sus",
    "yeet","flex","drip","woke","fomo","imo","tbh","ngl","irl",
    "smh","fr","nah","yah","bae","salty","savage","extra","basic",
    "periodt","understood","valid","bet","facts","sheesh","ok","okay",
    "haha","hahaha","lmfao","ikr","ik","idk","tysm","ty","np",
    "rn","asap","btw","fyi","omw","gtg","brb","ttyl","cya",
  ]);

  for (const line of lines) {
    const match = line.match(messageRegex);
    if (!match) continue;

    const [, date, time, sender, message] = match;
    const cleanSender = sender.trim();

    if (!stats[cleanSender]) {
      stats[cleanSender] = {
        name: cleanSender,
        messageCount: 0,
        totalChars: 0,
        maxMessageLength: 0,
        maxMessage: "",
        words: {},
        emojis: {},
        slangs: {},
        dates: {},
      };
    }

    const person = stats[cleanSender];
    person.messageCount++;
    person.totalChars += message.length;
    totalMessages++;

    if (message.length > person.maxMessageLength) {
      person.maxMessageLength = message.length;
      person.maxMessage = message.slice(0, 80);
    }

    // Word + slang frequency
    const words = message.toLowerCase().match(/\b[a-z]{2,}\b/g) || [];
    const stopWords = new Set([
      "the","and","for","that","this","with","have","from","they",
      "will","been","were","just","your","what","when","about",
      "okay","also","into","than","then","them","these","those",
      "would","could","should","there","their","here","more","some",
      "very","much","like","want","know","think","going","yeah",
    ]);

    for (const word of words) {
      if (!stopWords.has(word)) {
        person.words[word] = (person.words[word] || 0) + 1;
      }
      if (slangWords.has(word)) {
        person.slangs[word] = (person.slangs[word] || 0) + 1;
      }
    }

    // Emoji frequency
    const emojiRegex = /[\u{1F300}-\u{1FFFF}|\u{2600}-\u{27BF}]/gu;
    const emojis = message.match(emojiRegex) || [];
    for (const emoji of emojis) {
      person.emojis[emoji] = (person.emojis[emoji] || 0) + 1;
    }

    // Hour tracking
    const hourMatch = time.match(/(\d{1,2}):/);
    if (hourMatch) {
      let hour = parseInt(hourMatch[1]);
      if (time.toLowerCase().includes("pm") && hour !== 12) hour += 12;
      if (time.toLowerCase().includes("am") && hour === 12) hour = 0;
      hourCounts[hour]++;
    }

    // Date tracking
    dateCounts[date] = (dateCounts[date] || 0) + 1;
    person.dates[date] = (person.dates[date] || 0) + 1;

    // Response time tracking
    if (lastSender && lastSender !== cleanSender && lastTime) {
      const timeDiff = parseTime(time) - parseTime(lastTime);
      if (timeDiff > 0 && timeDiff < 3600) {
        if (!responseTimes[cleanSender]) responseTimes[cleanSender] = [];
        responseTimes[cleanSender].push(timeDiff);
      }
    }

    lastSender = cleanSender;
    lastTime = time;
  }

  // Calculate streaks
  const allDates = Object.keys(dateCounts).sort();
  let maxStreak = 1;
  let currentStreak = 1;
  for (let i = 1; i < allDates.length; i++) {
    const prev = new Date(allDates[i - 1]);
    const curr = new Date(allDates[i]);
    const diff = (curr - prev) / (1000 * 60 * 60 * 24);
    if (diff === 1) {
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 1;
    }
  }

  const people = Object.values(stats).map((person) => ({
    name: person.name,
    messageCount: person.messageCount,
    avgMessageLength: Math.round(person.totalChars / person.messageCount),
    maxMessageLength: person.maxMessageLength,
    maxMessage: person.maxMessage,
    topWords: Object.entries(person.words)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word, count]) => ({ word, count })),
    topEmoji: Object.entries(person.emojis)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([emoji, count]) => ({ emoji, count })),
    topSlang: Object.entries(person.slangs)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([word, count]) => ({ word, count })),
    avgResponseTime: responseTimes[person.name]
      ? Math.round(
          responseTimes[person.name].reduce((a, b) => a + b, 0) /
            responseTimes[person.name].length
        )
      : null,
  }));

  const peakHour = hourCounts.indexOf(Math.max(...hourCounts));
  const peakDate = Object.entries(dateCounts).sort((a, b) => b[1] - a[1])[0];

  return {
    totalMessages,
    people,
    peakHour,
    hourCounts,
    peakDate: peakDate ? { date: peakDate[0], count: peakDate[1] } : null,
    activeDays: Object.keys(dateCounts).length,
    longestStreak: maxStreak,
  };
}

function parseTime(timeStr) {
  const match = timeStr.match(/(\d{1,2}):(\d{2})/);
  if (!match) return 0;
  let hours = parseInt(match[1]);
  const mins = parseInt(match[2]);
  if (timeStr.toLowerCase().includes("pm") && hours !== 12) hours += 12;
  if (timeStr.toLowerCase().includes("am") && hours === 12) hours = 0;
  return hours * 3600 + mins * 60;
}

export function buildGeminiPrompt(parsedData) {
  const peopleDesc = parsedData.people
    .map(
      (p) =>
        `${p.name}: ${p.messageCount} messages, avg length ${p.avgMessageLength} chars, top words: ${p.topWords.map((w) => w.word).join(", ")}, top slang: ${p.topSlang.map((s) => s.word).join(", ") || "none"}`
    )
    .join("\n");

  return `Analyze these WhatsApp chat statistics and generate personality insights. Do not use actual message content — only these stats.

Chat stats:
- Total messages: ${parsedData.totalMessages}
- Active days: ${parsedData.activeDays}
- Longest streak: ${parsedData.longestStreak} days
- Peak hour: ${parsedData.peakHour}:00

People:
${peopleDesc}

For each person give:
1. A sharp, clever personality title (max 4 words, no emojis, no hashtags)
2. One witty sentence about their chat personality

Respond ONLY in this exact JSON format, no extra text, no markdown:
{
  "personalities": [
    { "name": "Person Name", "title": "Their Title", "summary": "One sentence." }
  ],
  "groupVibe": "One sharp sentence describing the overall group dynamic."
}`;
}