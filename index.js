require("dotenv").config();

const {
    Client,
    GatewayIntentBits,
    EmbedBuilder,
    SlashCommandBuilder,
    REST,
    Routes,
    ActivityType
} = require("discord.js");

const axios = require("axios");

// =========================
// ENV VARIABLES
// =========================

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const SERVER_ID = process.env.SERVER_ID;

if (!TOKEN || !CLIENT_ID || !SERVER_ID) {
    console.log("❌ Missing environment variables.");
    process.exit(1);
}

// =========================
// DISCORD CLIENT
// =========================

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

// =========================
// REGISTER COMMANDS
// =========================

async function registerCommands() {

    const commands = [

        new SlashCommandBuilder()
            .setName("players")
            .setDescription("Show online players"),

        new SlashCommandBuilder()
            .setName("server")
            .setDescription("Show server information"),

        new SlashCommandBuilder()
            .setName("playerinfo")
            .setDescription("Get player info by server ID")
            .addIntegerOption(option =>
                option
                    .setName("id")
                    .setDescription("Player server ID")
                    .setRequired(true)
            )

    ].map(cmd => cmd.toJSON());

    const rest = new REST({ version: "10" }).setToken(TOKEN);

    try {

        console.log("🔄 Registering slash commands...");

        await rest.put(
            Routes.applicationCommands(CLIENT_ID),
            { body: commands }
        );

        console.log("✅ Slash commands registered.");

    } catch (error) {

        console.error("❌ Slash command error:", error);

    }

}

// =========================
// FETCH SERVER DATA
// =========================

async function fetchServerData() {

    const response = await axios.get(
        `https://servers-frontend.fivem.net/api/servers/single/${SERVER_ID}`,
        {
            timeout: 10000
        }
    );

    return response.data.Data;

}

// =========================
// BOT READY
// =========================

client.once("ready", async () => {

    console.log(`✅ Logged in as ${client.user.tag}`);

    await registerCommands();

    client.user.setActivity("FiveM Server", {
        type: ActivityType.Watching
    });

});

// =========================
// INTERACTIONS
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

            let description = "❌ No players online.";

            if (players.length > 0) {

                description = players.map(player => {

                    let ping = "🟢";

                    if (player.ping > 80) ping = "🟡";
                    if (player.ping > 150) ping = "🔴";

                    return `\`${player.id}\` ${ping} **${player.name}** • ${player.ping}ms`;

                }).join("\n");

            }

            const embed = new EmbedBuilder()
                .setColor(0x00ff99)
                .setTitle("👥 Online Players")
                .setDescription(description.substring(0, 4000))
                .addFields(
                    {
                        name: "Players",
                        value: `${players.length}/${data.sv_maxclients}`,
                        inline: true
                    },
                    {
                        name: "Status",
                        value: "🟢 Online",
                        inline: true
                    }
                )
                .setTimestamp();

            await interaction.editReply({
                embeds: [embed]
            });

        } catch (error) {

            console.error(error);

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
                .setColor(0x0099ff)
                .setTitle("🖥️ Server Information")
                .setDescription(`${data.hostname}`)
                .addFields(
                    {
                        name: "Players",
                        value: `${data.clients}/${data.sv_maxclients}`,
                        inline: true
                    },
                    {
                        name: "Gametype",
                        value: data.gametype || "Unknown",
                        inline: true
                    },
                    {
                        name: "Map",
                        value: data.mapname || "Unknown",
                        inline: true
                    },
                    {
                        name: "Resources",
                        value: `${data.resources?.length || 0}`,
                        inline: true
                    },
                    {
                        name: "Join",
                        value: `https://cfx.re/join/${SERVER_ID}`,
                        inline: false
                    }
                )
                .setTimestamp();

            await interaction.editReply({
                embeds: [embed]
            });

        } catch (error) {

            console.error(error);

            await interaction.editReply(
                "❌ Failed to fetch server information."
            );

        }

    }

    // =========================
    // /PLAYERINFO
    // =========================

    if (interaction.commandName === "playerinfo") {

        await interaction.deferReply();

        try {

            const id = interaction.options.getInteger("id");

            const data = await fetchServerData();

            const players = data.players || [];

            const player = players.find(p => p.id === id);

            if (!player) {

                return interaction.editReply(
                    "❌ Player not found."
                );

            }

            const embed = new EmbedBuilder()
                .setColor(0xff9900)
                .setTitle("🎮 Player Information")
                .addFields(
                    {
                        name: "Name",
                        value: player.name,
                        inline: true
                    },
                    {
                        name: "ID",
                        value: `${player.id}`,
                        inline: true
                    },
                    {
                        name: "Ping",
                        value: `${player.ping}ms`,
                        inline: true
                    }
                )
                .setTimestamp();

            if (player.identifiers?.length) {

                embed.addFields({
                    name: "Identifiers",
                    value: `\`\`\`\n${player.identifiers.join("\n")}\n\`\`\``
                });

            }

            await interaction.editReply({
                embeds: [embed]
            });

        } catch (error) {

            console.error(error);

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
