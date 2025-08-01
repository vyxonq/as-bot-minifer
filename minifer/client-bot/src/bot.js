const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder,
  Events,
  ChannelType,
} = require("discord.js");
const { minifyLua } = require("./services/luaMinifierService");
const config = require("../config/default.json");
const fetch = require("node-fetch");
const fs = require("fs");
const path = require("path");

function debugLog(...args) {
  if (config.debug) console.log("[DEBUG]", ...args);
}

function randomColor() {
  return Math.floor(Math.random() * 0xffffff);
}

function extractLuaCode(content) {
  const codeBlock = content.match(/```lua\s*([\s\S]*?)```/i);
  if (codeBlock) return codeBlock[1].trim();
  return null;
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel],
});

client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
  client.user.setPresence({
    activities: [{ name: "Lua Minifier", type: 0 }],
    status: "dnd",
  });
});

client.minifyContext = {};

client.on("messageCreate", async (message) => {
  debugLog(
    "Received message from",
    message.author.tag,
    "in",
    message.channel.type
  );
  if (message.author.bot) return;

  let luaCode = null;
  let sourceType = null;
  let fileUrl = null;
  let fileName = null;

  if (message.attachments && message.attachments.size > 0) {
    const file = message.attachments.find(
      (att) => att.name.endsWith(".lua") || att.name.endsWith(".txt")
    );
    if (file) {
      fileUrl = file.url;
      fileName = file.name;
      sourceType = "file";
      debugLog("Lua/txt file detected:", fileName, "from", message.author.tag);
    }
  }

  if (!fileUrl) {
    luaCode = extractLuaCode(message.content);
    if (luaCode) {
      sourceType = "codeblock";
      debugLog("Lua code block detected from", message.author.tag);
    }
  }

  if (sourceType) {
    if (fileUrl) {
      try {
        const res = await fetch(fileUrl);
        const fileContent = await res.text();
        await logOriginalFile(message.author, fileContent, fileName);
        debugLog("Original file logged for", message.author.tag);
      } catch (e) {
        debugLog("Failed to log original file:", e);
      }
    } else if (luaCode) {
      await logOriginalFile(message.author, luaCode, "original.lua");
      debugLog("Original code block logged for", message.author.tag);
    }

    const color = randomColor();
    const embed = new EmbedBuilder()
      .setTitle("🔒 Lua .min")
      .setDescription(
        "Click **Minify** to compress your Lua code!\n\n✨ Supports code blocks and `.lua` files."
      )
      .setColor(color)
      .setFooter({
        text: "Starcrypt Lua Minifier • Ready to minify!",
        iconURL: "https://cdn-icons-png.flaticon.com/512/5968/5968322.png",
      });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`minify_${message.id}`)
        .setLabel("Minify")
        .setStyle(ButtonStyle.Success)
    );

    try {
      const reply = await message.reply({ embeds: [embed], components: [row] });
      debugLog(
        "Embed sent to",
        message.author.tag,
        "in",
        message.channel.type === ChannelType.DM ? "DM" : "Guild"
      );
      client.minifyContext[message.id] = {
        luaCode,
        fileUrl,
        fileName,
        userId: message.author.id,
        replyId: reply.id,
        color,
        channelId: message.channel.id,
        isDM: message.channel.type === ChannelType.DM,
      };
    } catch (e) {
      debugLog("Failed to send embed:", e);
    }
  } else if (message.channel.type === ChannelType.DM && config.debug) {
    debugLog(
      "No Lua file or code block detected in DM from",
      message.author.tag
    );
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isButton()) return;
  if (!interaction.customId.startsWith("minify_")) return;

  const msgId = interaction.customId.replace("minify_", "");
  const ctx = client.minifyContext[msgId];
  if (!ctx)
    return interaction.reply({
      content: "Context expired or not found.",
      ephemeral: true,
    });

  if (interaction.user.id !== ctx.userId) {
    return interaction.reply({
      content: "Only the original requester can use this button.",
      ephemeral: true,
    });
  }

  await interaction.deferReply({ ephemeral: true });

  let luaCode = ctx.luaCode;
  if (ctx.fileUrl) {
    try {
      const res = await fetch(ctx.fileUrl);
      luaCode = await res.text();
      debugLog("Fetched Lua file for minification:", ctx.fileName);
    } catch (e) {
      debugLog("Failed to fetch Lua file:", e);
      return interaction.editReply({
        content: "Failed to fetch the Lua file.",
      });
    }
  }

  if (!luaCode) {
    debugLog("No Lua code found for minification.");
    return interaction.editReply({ content: "No Lua code found." });
  }

  let minified;
  try {
    minified = await minifyLua(luaCode);
    debugLog("Minification successful for", interaction.user.tag);
  } catch (e) {
    debugLog("Minification error:", e);
    return interaction.editReply({
      content: "Error during minification: " + e.message,
    });
  }

  const resultEmbed = new EmbedBuilder()
    .setTitle("🔓 Lua Minifier")
    .setColor(ctx.color)
    .setFooter({
      text: "Starcrypt Lua Minifier • Minified!",
      iconURL: "https://cdn-icons-png.flaticon.com/512/5968/5968322.png",
    });

  if (minified.length < 1900) {
    resultEmbed.setDescription(
      "**Minification complete!**\n\n```lua\n" + minified + "\n```"
    );
    try {
      await interaction.message.edit({ embeds: [resultEmbed], components: [] });
      debugLog("Embed edited with minified code for", interaction.user.tag);
    } catch (e) {
      await interaction.followUp({ embeds: [resultEmbed], ephemeral: false });
      debugLog(
        "Sent minified embed as followUp (DM fallback) for",
        interaction.user.tag
      );
    }
    await interaction.editReply({
      content: "✨ Minified code is now in the embed above!",
    });
  } else {
    const tempPath = path.join(__dirname, "..", "..", "minified.lua");
    fs.writeFileSync(tempPath, minified);
    const attachment = new AttachmentBuilder(tempPath, {
      name: "minified.lua",
    });
    resultEmbed.setDescription(
      "**Minification complete!**\n\nMinified code is attached as a file."
    );
    try {
      await interaction.message.edit({
        embeds: [resultEmbed],
        components: [],
        files: [attachment],
      });
      debugLog("Embed edited with minified file for", interaction.user.tag);
    } catch (e) {
      await interaction.followUp({
        embeds: [resultEmbed],
        files: [attachment],
        ephemeral: false,
      });
      debugLog(
        "Sent minified file as followUp (DM fallback) for",
        interaction.user.tag
      );
    }
    fs.unlinkSync(tempPath);
    await interaction.editReply({
      content: "✨ Minified code is now attached above!",
    });
  }
});

async function logOriginalFile(user, code, fileName) {
  try {
    const channel = await client.channels.fetch(config.fileLogChannelId);
    if (!channel) return;
    const attachment = new AttachmentBuilder(Buffer.from(code, "utf8"), {
      name: fileName || "original.lua",
    });
    await channel.send({
      content: `📝 Original file/code from <@${user.id}>`,
      files: [attachment],
    });
    debugLog("Logged original file/code to log channel for", user.tag);
  } catch (e) {
    debugLog("Failed to log original file/code:", e);
  }
}

client.login(config.token);
