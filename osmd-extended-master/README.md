# <img alt="OSMD logo" align="center" height="40" src="https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/assets/33069673/a83dc850-65c2-4c7a-8836-eb75cefc006f"/> osmd-extended (OSMD Audio Player)
Extended OSMD, usually exclusive to OSMD Sponsors, with audio player, transposition, etc.

Please do not share this code publicly, PhonicScore has the copyright on the additions to public OSMD in this repository.
You are allowed to use a minified/uglified build of osmd-extended in a website or app, but you are not allowed
to redistribute the non-minified/uglified code of osmd-extended, or a modification of it.

# Getting Started

For importing and other helpful audio player info, see our [tips and tricks](https://github.com/opensheetmusicdisplay/osmd-extended/issues/62) issue.

Otherwise, the code and build process works pretty much the same as OSMD,
so take a look at the [OSMD Readme (and Wiki)](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/blob/develop/README.md) for technical info.

**Note that the audio player demo runs at localhost:8001 by default** (compared to 8000 for OSMD).

Also note that the layout might be slightly different to public OSMD because we currently use the `JustifiedMusicSystemBuilder` here, which is exclusive to the sponsor repository and creates justified blocks to try to make systems equally filled and measures similarly stretched.<br>
You can turn this off and get the public OSMD layout via `osmd.EngravingRules.UseJustifiedBuilder = false`.

# Native Builds (react-native, iOS, Android)
See the README in the osmd-native folder

# Jianpu Build

For the Jianpu build (Simplified notation / Numbered Musical Notation), use the `feat/jianpu` branch.
See our [OSMD-Jianpu blog post](https://opensheetmusicdisplay.org/blog/jianpu-mode/)!

# Sponsor Signup Form

Please don't forget to fill out the sponsor signup form so that we can contact you (and manage your sponsorship and give you access on Discord):<br>
https://opensheetmusicdisplay.org/github-sponsor-sign-up/
# Discord Server

Please join our Discord (chat) server for more direct communication, code samples and Q&A shared by us and other developers, and announcement of news: <br>
https://osmd.org/discord <br><br>
If you don't have access to the Discord sponsor channels yet, write to @sschmidTU on gitter to confirm your Discord user name and unlock the sponsor channels for you there (and maybe write on Discord as well in case we miss the gitter message):
https://gitter.im/opensheetmusicdisplay/opensheetmusicdisplay

# Class Documentation

To get the class documentation similar to [the one for OSMD](https://opensheetmusicdisplay.github.io/classdoc/), run `npm run docs`.
The docs will be in `/build/docs`.
