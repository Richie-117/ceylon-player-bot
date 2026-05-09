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

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

const TOKEN = process.env.DISCORD_TOKEN;
const SERVER_ID = process.env.SERVER_ID;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

async function registerCommands() {

    const commands = [
        new SlashCommandBuilder()
            .setName("players")
            .setDescription("Show online FiveM players")
            .toJSON()
    ];

    const rest = new REST({ version: "10" }).setToken(TOKEN);

    try {

        console.log("Registering slash commands...");

        await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
            { body: commands }
        );

        console.log("Slash commands registered.");

    } catch (err) {

        console.error(err);

    }

}

client.once("ready", async () => {

    console.log(`Logged in as ${client.user.tag}`);

    await registerCommands();

});

client.on("interactionCreate", async interaction => {

    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === "players") {

        await interaction.deferReply();

        try {

            const res = await axios.get(
                `https://servers-frontend.fivem.net/api/servers/single/${SERVER_ID}`
            );

            const data = res.data.Data;

            const players = data.players || [];

            const playerText = players.length
                ? players.map((p, i) =>
                    `${i + 1}. ${p.name}`
                ).join("\n")
                : "No players online";

            const embed = new EmbedBuilder()
                .setTitle(data.hostname)
                .setDescription(playerText)
                .addFields({
                    name: "Players",
                    value: `${players.length}/${data.sv_maxclients}`,
                    inline: true
                })
                .setColor(0x0099ff)
                .setTimestamp();

            await interaction.editReply({
                embeds: [embed]
            });

        } catch (err) {

            console.error(err);

            await interaction.editReply(
                "Failed to fetch player list."
            );

        }

    }

});

client.login(TOKEN);
