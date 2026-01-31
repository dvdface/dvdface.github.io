import { defaultTheme } from '@vuepress/theme-default'
import { defineUserConfig } from 'vuepress'
import { viteBundler } from '@vuepress/bundler-vite'

export default defineUserConfig({
  bundler: viteBundler(),
  dest: 'dist',
  lang: 'zh-CN',
  title: '首页',
  description: '静态网站 · 由 dvdface.github.io 托管',
  base: '/',
  theme: defaultTheme({
    navbar: [
      { text: '首页', link: '/' },
      { text: '提示词', link: '/prompts/' },
    ],
    sidebar: {
      '/prompts/': [
        {
          text: '提示词',
          children: ['/prompts/README.md', '/posts/prompt-writing-sop.md'],
        },
      ],
      '/posts/': [
        {
          text: '文章',
          children: ['/posts/prompt-writing-sop.md'],
        },
      ],
    },
    editLink: false,
    lastUpdated: false,
    contributors: false,
  }),
})
