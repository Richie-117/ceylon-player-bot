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
const OWNER_ID = process.env.OWNER_ID;

if (!TOKEN || !CLIENT_ID || !SERVER_ID || !OWNER_ID) {
    console.log("❌ Missing environment variables.");
    process.exit(1);
}

// =========================
// DISCORD CLIENT
// =========================

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers
    ]
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
            .setDescription("Show ceylonrp server information"),

        new SlashCommandBuilder()
            .setName("playerinfo")
            .setDescription("Get player info by server ID")
            .addIntegerOption(option =>
                option
                    .setName("id")
                    .setDescription("Player crp server ID")
                    .setRequired(true)
            ),

        new SlashCommandBuilder()
            .setName("servers")
            .setDescription("Shows all servers using the bot"),

        new SlashCommandBuilder()
            .setName("botstats")
            .setDescription("Shows bot statistics")

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

    console.log("🌍 Servers Using Bot:");

    client.guilds.cache.forEach(guild => {

        console.log(
            `${guild.name} | ${guild.memberCount} members | ID: ${guild.id}`
        );

    });

});

// =========================
// BOT JOINED SERVER
// =========================

client.on("guildCreate", async (guild) => {

    try {

        const owner = await guild.fetchOwner().catch(() => null);

        const embed = new EmbedBuilder()
            .setColor(0x00ff99)
            .setTitle("✅ Bot Added To Server")
            .setThumbnail(guild.iconURL())
            .addFields(
                {
                    name: "Server",
                    value: guild.name,
                    inline: true
                },
                {
                    name: "Members",
                    value: `${guild.memberCount}`,
                    inline: true
                },
                {
                    name: "Server ID",
                    value: guild.id,
                    inline: false
                },
                {
                    name: "Owner",
                    value: owner
                        ? owner.user.tag
                        : "Unknown",
                    inline: false
                }
            )
            .setFooter({
                    text: `Made by Richie`
                })
            .setTimestamp();

        const user = await client.users.fetch(OWNER_ID);

        await user.send({
            embeds: [embed]
        });

    } catch (err) {

        console.error("Guild Create Error:", err);

    }

});

// =========================
// BOT REMOVED SERVER
// =========================

client.on("guildDelete", async (guild) => {

    try {

        const embed = new EmbedBuilder()
            .setColor(0xff0000)
            .setTitle("❌ Bot Removed From Server")
            .setThumbnail(guild.iconURL())
            .addFields(
                {
                    name: "Server",
                    value: guild.name,
                    inline: true
                },
                {
                    name: "Server ID",
                    value: guild.id,
                    inline: true
                }
            )
            .setTimestamp();

        const user = await client.users.fetch(OWNER_ID);

        await user.send({
            embeds: [embed]
        });

    } catch (err) {

        console.error("Guild Delete Error:", err);

    }

});

// =========================
// INTERACTIONS
// =========================

client.on("interactionCreate", async interaction => {

    if (!interaction.isChatInputCommand()) return;

    // =========================
    // OWNER ONLY CHECK
    // =========================

    const ownerOnlyCommands = [
        "servers",
        "botstats"
    ];

    if (
        ownerOnlyCommands.includes(interaction.commandName) &&
        interaction.user.id !== OWNER_ID
    ) {

        return interaction.reply({
            content: "❌ Owner only command.",
            ephemeral: true
        });

    }

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
                .setFooter({
                    text: `Made by Richie`
                })
                .setTimestamp();

            await interaction.editReply({
                embeds: [embed]
            });

        } catch (error) {

            console.error(error);

            await interaction.editReply(
                "🔴 FiveM server is currently offline or unreachable."
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
                .setFooter({
                    text: `Made by Richie`
                })
                .setTimestamp();

            await interaction.editReply({
                embeds: [embed]
            });

        } catch (error) {

            console.error(error);

            await interaction.editReply(
                 "🔴 FiveM server is currently offline or unreachable."
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
                .setFooter({
                        text: `Made by Richie`
                    })
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
                 "🔴 FiveM server is currently offline or unreachable."
            );

        }

    }

    // =========================
    // /SERVERS
    // =========================

    if (interaction.commandName === "servers") {

        const servers = client.guilds.cache.map(guild => {

            return (
                `**${guild.name}**\n` +
                `👥 Members: ${guild.memberCount}\n` +
                `🆔 ID: ${guild.id}\n`
            );

        }).join("\n");

        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle("🌍 Servers Using Bot")
            .setDescription(
                servers || "No servers found."
            )
            .setFooter({
                text: `Made by Richie`
            })
            .setTimestamp();

        await interaction.reply({
            embeds: [embed],
            ephemeral: true
        });

    }

    // =========================
    // /BOTSTATS
    // =========================

    if (interaction.commandName === "botstats") {

        const totalServers = client.guilds.cache.size;

        const totalUsers = client.guilds.cache.reduce(
            (acc, guild) => acc + guild.memberCount,
            0
        );

        const embed = new EmbedBuilder()
            .setColor(0x00ffff)
            .setTitle("📊 Bot Statistics")
            .addFields(
                {
                    name: "Servers",
                    value: `${totalServers}`,
                    inline: true
                },
                {
                    name: "Users",
                    value: `${totalUsers}`,
                    inline: true
                },
                {
                    name: "Ping",
                    value: `${client.ws.ping}ms`,
                    inline: true
                }
            )
            .setThumbnail(client.user.displayAvatarURL())
            .setFooter({
                text: `Made by Richie`
            })
            .setTimestamp();

        await interaction.reply({
            embeds: [embed],
            ephemeral: true
        });

    }

});

// =========================
// LOGIN
// =========================

client.login(TOKEN);
