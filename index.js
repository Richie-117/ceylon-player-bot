require("dotenv").config();

const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");
const axios = require("axios");

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

const TOKEN = process.env.DISCORD_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;
const SERVER_ID = process.env.SERVER_ID;

let messageId = null;

async function updateStatus() {

    try {

        const res = await axios.get(
            `https://servers-frontend.fivem.net/api/servers/single/${SERVER_ID}`
        );

        const data = res.data.Data;

        const players = data.players || [];

        const playerText = players.length
            ? players.map((p, i) => `${i + 1}. ${p.name}`).join("\n")
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

        const channel = await client.channels.fetch(CHANNEL_ID);

        if (!messageId) {

            const msg = await channel.send({
                embeds: [embed]
            });

            messageId = msg.id;

        } else {

            const msg = await channel.messages.fetch(messageId);

            await msg.edit({
                embeds: [embed]
            });

        }

        console.log("Updated");

    } catch (err) {

        console.log(err.message);

    }

}

client.once("ready", async () => {

    console.log(`Logged in as ${client.user.tag}`);

    await updateStatus();

    setInterval(updateStatus, 60000);

});

client.login(TOKEN);