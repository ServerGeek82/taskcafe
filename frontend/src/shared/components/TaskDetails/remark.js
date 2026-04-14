import { visit } from 'unist-util-visit';
import emoji from 'node-emoji';
import { emoticon } from 'emoticon';

const RE_EMOJI = /:\+1:|:-1:|:[\w-]+:/g;
const RE_SHORT = /[$@|*'",;.=:\-)([\]\\/<>038BOopPsSdDxXzZ]{2,5}/g;

const DEFAULT_SETTINGS = {
  padSpaceAfter: false,
  emoticon: false,
};

function plugin(options) {
  const settings = { ...DEFAULT_SETTINGS, ...options };
  const pad = !!settings.padSpaceAfter;
  const emoticonEnable = !!settings.emoticon;

  function getEmojiByShortCode(match) {
    const iconFull = emoticon.find((e) => e.emoticons.includes(match));
    const iconPart = emoticon.find((e) => e.emoticons.includes(match.slice(0, -1)));
    const trimmedChar = iconPart ? match.slice(-1) : '';
    const addPad = pad ? ' ' : '';
    const icon = iconFull ? iconFull.emoji + addPad : iconPart && iconPart.emoji + addPad + trimmedChar;
    return icon || match;
  }

  function getEmoji(match) {
    const got = emoji.get(match);
    if (got !== match) {
      return pad ? `${got} ` : got;
    }
    return match;
  }

  function transformer(tree) {
    visit(tree, 'text', function (node) {
      node.value = node.value.replace(RE_EMOJI, getEmoji);

      if (emoticonEnable) {
        node.value = node.value.replace(RE_SHORT, getEmojiByShortCode);
      }
    });
  }

  return transformer;
}

export default plugin;
