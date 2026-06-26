export function parseWhatsAppChat(text) {
  const lines = text.split("\n");
  const messageRegex =
    /^(\d{1,2}\/\d{1,2}\/\d{2,4}),\s(\d{1,2}:\d{2}(?::\d{2})?(?:\s?[aApP][mM])?)\s-\s([^:]+):\s(.+)$/;

  const stats = {};
  const hourCounts = Array(24).fill(0);
  const dateCounts = {};
  let totalMessages = 0;
  let lastSender = null;
  let lastTimeSeconds = null;
  const responseTimes = {};

  const slangWords = new Set([
    "lol","lmao","omg","wtf","bruh","bro","sis","fam","lit","vibe",
    "slay","cap","nocap","bussin","goat","lowkey","highkey","sus",
    "yeet","flex","drip","woke","fomo","imo","tbh","ngl","irl",
    "smh","fr","nah","yah","bae","salty","savage","extra","basic",
    "periodt","valid","bet","facts","sheesh","haha","hahaha","lmfao",
    "ikr","ik","idk","tysm","ty","np","rn","asap","btw","fyi",
    "omw","gtg","brb","ttyl","cya","bhai","yaar","arre","arey",
    "kya","hai","nahi","haan","bas","chal","acha","theek","matlab",
    "areh","oof","damn","dude","yo","sup","nope","yep","welp",
    "istg","idc","idgaf","ffs","smh","rip","gg","glhf","afk",
    "pls","plz","thx","u","ur","r","b","4","2","cuz","coz",
    "gonna","wanna","gotta","kinda","sorta","lemme","gimme","ima",
    "tf","stfu","gtfo","lmk","hmu","ofc","obvs","tbf","imo",
  ]);

  for (const line of lines) {
    const match = line.match(messageRegex);
    if (!match) continue;

    const [, date, time, sender, message] = match;
    const cleanSender = sender.trim();

    // Skip system messages
    if (
      message.includes("Messages and calls are end-to-end encrypted") ||
      message.includes("added") ||
      message.includes("left") ||
      message.includes("created group") ||
      message.includes("changed the subject") ||
      message === "<Media omitted>"
    ) continue;

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
      };
    }

    const person = stats[cleanSender];
    person.messageCount++;
    person.totalChars += message.length;
    totalMessages++;

    if (message.length > person.maxMessageLength) {
      person.maxMessageLength = message.length;
      person.maxMessage = message.slice(0, 100);
    }

    // Word frequency — minimal stopwords, keep it real
    const words = message.toLowerCase().match(/\b[a-zA-Z]{2,}\b/g) || [];
    const stopWords = new Set([
      "the","and","for","that","this","with","have","from","they",
      "will","been","were","your","what","when","about","into",
      "than","then","them","there","their","would","could","should",
      "these","those","more","some","just","also","very","much",
    ]);

    for (const word of words) {
      const w = word.toLowerCase();
      if (!stopWords.has(w) && w.length >= 2) {
        person.words[w] = (person.words[w] || 0) + 1;
      }
      if (slangWords.has(w)) {
        person.slangs[w] = (person.slangs[w] || 0) + 1;
      }
    }

    // Emoji frequency — comprehensive regex
    const emojiRegex = /(\p{Emoji_Presentation}|\p{Extended_Pictographic})/gu;
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

    // Response time — only between different senders
    const currentTimeSeconds = parseTimeToSeconds(time);
    if (
      lastSender &&
      lastSender !== cleanSender &&
      lastTimeSeconds !== null &&
      currentTimeSeconds > lastTimeSeconds
    ) {
      const diff = currentTimeSeconds - lastTimeSeconds;
      if (diff > 0 && diff < 7200) { // max 2 hours gap
        if (!responseTimes[cleanSender]) responseTimes[cleanSender] = [];
        responseTimes[cleanSender].push(diff);
      }
    }

    lastSender = cleanSender;
    lastTimeSeconds = currentTimeSeconds;
  }

  // Calculate streak using correct date parsing
  const allDates = Object.keys(dateCounts).sort((a, b) => {
    return parseDateToTimestamp(a) - parseDateToTimestamp(b);
  });

  let maxStreak = 1;
  let currentStreak = 1;

  for (let i = 1; i < allDates.length; i++) {
    const prevTs = parseDateToTimestamp(allDates[i - 1]);
    const currTs = parseDateToTimestamp(allDates[i]);
    const diffDays = Math.round((currTs - prevTs) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) {
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else if (diffDays > 1) {
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
      .slice(0, 6)
      .map(([word, count]) => ({ word, count })),
    topEmoji: Object.entries(person.emojis)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 1)
      .map(([emoji, count]) => ({ emoji, count })),
    topSlang: Object.entries(person.slangs)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
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

function parseTimeToSeconds(timeStr) {
  const match = timeStr.match(/(\d{1,2}):(\d{2})/);
  if (!match) return 0;
  let hours = parseInt(match[1]);
  const mins = parseInt(match[2]);
  if (timeStr.toLowerCase().includes("pm") && hours !== 12) hours += 12;
  if (timeStr.toLowerCase().includes("am") && hours === 12) hours = 0;
  return hours * 3600 + mins * 60;
}

function parseDateToTimestamp(dateStr) {
  // Handles d/m/yy and d/m/yyyy formats
  const parts = dateStr.split("/");
  if (parts.length !== 3) return 0;
  let [day, month, year] = parts.map(Number);
  if (year < 100) year += 2000;
  return new Date(year, month - 1, day).getTime();
}

export function buildGeminiPrompt(parsedData) {
  const peopleDesc = parsedData.people
    .map(
      (p) =>
        `${p.name}: ${p.messageCount} messages, avg length ${p.avgMessageLength} chars, top words: ${p.topWords.map((w) => w.word).join(", ")}, top slang: ${p.topSlang.map((s) => s.word).join(", ") || "none"}`
    )
    .join("\n");

  return `Analyze these WhatsApp chat statistics and generate personality insights. These are stats only — not actual messages.

Stats:
- Total messages: ${parsedData.totalMessages}
- Active days: ${parsedData.activeDays}
- Longest streak: ${parsedData.longestStreak} days
- Peak hour: ${parsedData.peakHour}:00

People:
${peopleDesc}

For each person give:
1. A sharp, clever personality title (max 4 words, no emojis, no hashtags)
2. One witty sentence about their chat personality (max 20 words)

Respond ONLY in this exact JSON format. No extra text, no markdown, no explanation:
{
  "personalities": [
    { "name": "Person Name", "title": "Their Title", "summary": "One sentence." }
  ],
  "groupVibe": "One sharp sentence about the group dynamic."
}`;
}