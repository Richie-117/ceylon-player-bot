require("dotenv").config();

const {
    Client,
    GatewayIntentBits,
    EmbedBuilder,
    SlashCommandBuilder,
    REST,
    Routes
} = require("discord.js");

const axios = require("axios");

// =========================
// ENV VARIABLES
// =========================

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const SERVER_ID = process.env.SERVER_ID;

// =========================
// DISCORD CLIENT
// =========================

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

// =========================
// REGISTER SLASH COMMANDS
// =========================

async function registerCommands() {

    const commands = [

        new SlashCommandBuilder()
            .setName("players")
            .setDescription("Show online players")
            .toJSON(),

        new SlashCommandBuilder()
            .setName("server")
            .setDescription("Show server information")
            .toJSON(),

        new SlashCommandBuilder()
            .setName("playerinfo")
            .setDescription("Get player info by server ID")
            .addIntegerOption(option =>
                option
                    .setName("id")
                    .setDescription("Server player ID")
                    .setRequired(true)
            )
            .toJSON()

    ];

    const rest = new REST({ version: "10" }).setToken(TOKEN);

    try {

        console.log("Registering slash commands...");

        await rest.put(
            Routes.applicationCommands(CLIENT_ID),
            { body: commands }
        );

        console.log("Slash commands registered.");

    } catch (err) {

        console.error(err);

    }

}

// =========================
// FETCH FIVEM DATA
// =========================

async function fetchServerData() {

    const res = await axios.get(
        `https://servers-frontend.fivem.net/api/servers/single/${SERVER_ID}`
    );

    return res.data.Data;

}

// =========================
// READY EVENT
// =========================

client.once("ready", async () => {

    console.log(`Logged in as ${client.user.tag}`);

    await registerCommands();

    client.user.setActivity("Ceylon Roleplay", {
        type: 3
    });

});

// =========================
// COMMAND HANDLER
// =========================

client.on("interactionCreate", async interaction => {

    if (!interaction.isChatInputCommand()) return;

    // =========================
    // /PLAYERS
    // =========================

    if (interaction.commandName === "players") {

        await interaction.deferReply();

        try {

            const data = await fetchServerData();

            const players = data.players || [];

            const playerText = players.length
                ? players.map(p => {

                    let pingEmoji = "🟢";

                    if (p.ping > 80) pingEmoji = "🟡";
                    if (p.ping > 150) pingEmoji = "🔴";

                    return `\`${p.id}\` ${pingEmoji} **${p.name}** — ${p.ping}ms`;

                }).join("\n")
                : "❌ No players online";

            const embed = new EmbedBuilder()
                .setTitle("🌴 Ceylon Roleplay Players")
                .setDescription(playerText)
                .addFields(
                    {
                        name: "👥 Players",
                        value: `\`${players.length}/${data.sv_maxclients}\``,
                        inline: true
                    },
                    {
                        name: "📡 Status",
                        value: "🟢 Online",
                        inline: true
                    }
                )
                .setColor(0x00ff99)
                .setFooter({
                    text: "🇱🇰 Ceylon Roleplay"
                })
                .setTimestamp();

            await interaction.editReply({
                embeds: [embed]
            });

        } catch (err) {

            console.error(err);

            await interaction.editReply(
                "❌ Failed to fetch players."
            );

        }

    }

    // =========================
    // /SERVER
    // =========================

    if (interaction.commandName === "server") {

        await interaction.deferReply();

        try {

            const data = await fetchServerData();

            const embed = new EmbedBuilder()
                .setTitle("🖥️ Server Information")
                .setDescription(`🌴 **${data.hostname}**`)
                .addFields(
                    {
                        name: "👥 Players",
                        value: `\`${data.clients}/${data.sv_maxclients}\``,
                        inline: true
                    },
                    {
                        name: "🎮 Gametype",
                        value: data.gametype || "Unknown",
                        inline: true
                    },
                    {
                        name: "🗺️ Map",
                        value: data.mapname || "Unknown",
                        inline: true
                    },
                    {
                        name: "📦 Resources",
                        value: `\`${data.resources?.length || 0}\``,
                        inline: true
                    },
                    {
                        name: "🌐 Connect",
                        value: `cfx.re/join/${SERVER_ID}`,
                        inline: false
                    }
                )
                .setColor(0x0099ff)
                .setFooter({
                    text: "FiveM Server Status"
                })
                .setTimestamp();

            await interaction.editReply({
                embeds: [embed]
            });

        } catch (err) {

            console.error(err);

            await interaction.editReply(
                "❌ Failed to fetch server info."
            );

        }

    }

    // =========================
    // /PLAYERINFO
    // =========================

    if (interaction.commandName === "playerinfo") {

        await interaction.deferReply();

        try {

            const playerId = interaction.options.getInteger("id");

            const data = await fetchServerData();

            const players = data.players || [];

            const player = players.find(p => p.id === playerId);

            if (!player) {

                return interaction.editReply(
                    "❌ Player not found."
                );

            }

            const embed = new EmbedBuilder()
                .setTitle("🎮 Player Information")
                .addFields(
                    {
                        name: "🪪 Name",
                        value: player.name,
                        inline: true
                    },
                    {
                        name: "🆔 Server ID",
                        value: `\`${player.id}\``,
                        inline: true
                    },
                    {
                        name: "📶 Ping",
                        value: `\`${player.ping}ms\``,
                        inline: true
                    }
                )
                .setColor(0xff9900)
                .setFooter({
                    text: "FiveM Player Lookup"
                })
                .setTimestamp();

            if (player.identifiers && player.identifiers.length > 0) {

                embed.addFields({
                    name: "🔗 Identifiers",
                    value: `\`\`\`${player.identifiers.join("\n")}\`\`\``,
                    inline: false
                });

            }

            await interaction.editReply({
                embeds: [embed]
            });

        } catch (err) {

            console.error(err);

            await interaction.editReply(
                "❌ Failed to fetch player info."
            );

        }

    }

});

// =========================
// LOGIN
// =========================

client.login(TOKEN);
