import React, { useMemo } from 'react';
import { Linking, Text, View, useWindowDimensions } from 'react-native';
import RenderHTML from '@native-html/render';
import type { Block } from '../api/types';
import { api } from '../api';
import { blockHtml, mediaUrl, toBlocks } from '../utils/content';
import { colors, s } from '../theme';

export function Article({ content }: { content: Block[] | string | null | undefined }) {
  const { width } = useWindowDimensions();
  const source = useMemo(() => ({ html: toBlocks(content).map(block => blockHtml(block, api.base)).join('') }), [content]);
  if (!source.html) return <Text style={s.meta}>No readable content yet.</Text>;
  return <View><RenderHTML contentWidth={Math.max(200, Math.min(width - 40, 940))} source={source}
    systemFonts={['Manrope_400Regular', 'BarlowCondensed_700Bold', 'BarlowCondensed_800ExtraBold']}
    baseStyle={{ color: colors.ink, fontFamily: 'Manrope_400Regular', fontSize: 17, lineHeight: 29 }}
    tagsStyles={{ h1: { fontSize: 34, lineHeight: 38 }, h2: { fontSize: 28, lineHeight: 34 }, p: { marginTop: 8, marginBottom: 12 }, img: { borderRadius: 0 }, blockquote: { borderLeftWidth: 3, borderLeftColor: colors.ink, paddingLeft: 16 }, pre: { backgroundColor: colors.wash, padding: 12 }, figcaption: { color: colors.muted, fontSize: 12 }, a: { color: colors.ink, textDecorationLine: 'underline' } }}
    ignoredDomTags={['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'video', 'audio']}
    domVisitors={{ onElement: element => {
      if (element.tagName === 'img') {
        const resolved = mediaUrl(element.attribs.src, api.base);
        if (resolved) element.attribs.src = resolved; else delete element.attribs.src;
        delete element.attribs.srcset;
      }
    } }}
    renderersProps={{ a: { onPress: (_event, href) => { const url = mediaUrl(href, api.base); if (url) void Linking.openURL(url).catch(() => {}); } }, img: { enableExperimentalPercentWidth: true } }} />
  </View>;
}
