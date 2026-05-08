/**
 * FENR Built-in Bots
 * These run inside the server process — no external token needed.
 * They respond to commands in any channel they're registered for.
 *
 * Commands:
 *   !roll [N]      — roll a die (default d6, or dN)
 *   !flip          — flip a coin
 *   !8ball <q>     — magic 8-ball answer
 *   !poll "Q" A B C — create a poll with emoji reactions
 *   !help          — list all commands
 */

const EIGHT_BALL = [
  'It is certain.', 'It is decidedly so.', 'Without a doubt.',
  'Yes, definitely.', 'You may rely on it.', 'As I see it, yes.',
  'Most likely.', 'Outlook good.', 'Yes.', 'Signs point to yes.',
  'Reply hazy, try again.', 'Ask again later.', 'Better not tell you now.',
  'Cannot predict now.', 'Concentrate and ask again.',
  'Don\'t count on it.', 'My reply is no.', 'My sources say no.',
  'Outlook not so good.', 'Very doubtful.'
];

const POLL_EMOJIS = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣'];

export function handleBuiltinCommand(content, channelId, io) {
  const trimmed = content.trim();
  if (!trimmed.startsWith('!')) return false;

  const [cmd, ...args] = trimmed.slice(1).split(' ');
  const command = cmd.toLowerCase();

  function botMessage(text) {
    io.to(channelId).emit('new_message', {
      id: `bot-${Date.now()}-${Math.random()}`,
      channel_id: channelId,
      user_id: 'fen-bot',
      content: text,
      attachments: [],
      edited: false,
      reactions: [],
      created_at: new Date().toISOString(),
      profiles: { id: 'fen-bot', username: 'Fen 🐺', avatar_url: null }
    });
  }

  switch (command) {
    case 'roll': {
      const sides = parseInt(args[0]?.replace('d','')) || 6;
      if (isNaN(sides) || sides < 2 || sides > 1000) {
        botMessage('🎲 Usage: `!roll` or `!roll d20` (2–1000 sides)');
        return true;
      }
      const result = Math.floor(Math.random() * sides) + 1;
      botMessage(`🎲 Rolled a **d${sides}** — **${result}**!`);
      return true;
    }

    case 'flip': {
      const result = Math.random() < 0.5 ? 'Heads 🦅' : 'Tails 🦴';
      botMessage(`🪙 **${result}**`);
      return true;
    }

    case '8ball': {
      const question = args.join(' ').trim();
      if (!question) { botMessage('🎱 Ask me a question: `!8ball Will FENR beat Discord?`'); return true; }
      const answer = EIGHT_BALL[Math.floor(Math.random() * EIGHT_BALL.length)];
      botMessage(`🎱 *${question}*\n**${answer}**`);
      return true;
    }

    case 'poll': {
      // Parse: !poll "Question" Option1 Option2 Option3
      const raw = args.join(' ');
      const questionMatch = raw.match(/^"([^"]+)"\s*(.*)/);
      if (!questionMatch) {
        botMessage('📊 Usage: `!poll "Question?" Option1 Option2 Option3`');
        return true;
      }
      const question = questionMatch[1];
      const options = questionMatch[2].trim().split(/\s+/).filter(Boolean);
      if (options.length < 2) {
        botMessage('📊 Need at least 2 options. Example: `!poll "Favorite color?" Red Blue Green`');
        return true;
      }
      if (options.length > 9) {
        botMessage('📊 Maximum 9 options per poll.');
        return true;
      }
      const lines = options.map((opt, i) => `${POLL_EMOJIS[i]} ${opt}`).join('\n');
      botMessage(`📊 **${question}**\n\n${lines}\n\n*React to vote!*`);
      return true;
    }

    case 'help': {
      botMessage(
        '🐺 **Fen Bot Commands**\n\n' +
        '`!roll` or `!roll d20` — Roll a die\n' +
        '`!flip` — Flip a coin\n' +
        '`!8ball <question>` — Ask the magic 8-ball\n' +
        '`!poll "Question?" A B C` — Create a poll\n' +
        '`!help` — Show this message'
      );
      return true;
    }

    default:
      return false;
  }
}
