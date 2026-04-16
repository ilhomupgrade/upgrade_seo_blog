import { config, collection, singleton, fields } from '@keystatic/core';

export default config({
  storage: {
    kind: 'local',
  },

  ui: {
    brand: { name: 'Upgrade Blog' },
  },

  collections: {
    blog: collection({
      label: 'Статьи',
      slugField: 'title',
      path: 'src/data/blog/*',
      entryLayout: 'content',
      format: { contentField: 'content' },
      schema: {
        title: fields.slug({
          name: {
            label: 'Заголовок',
            validation: { isRequired: true },
          },
          slug: {
            label: 'URL (slug)',
            description: 'Транслитерированный URL статьи',
          },
        }),
        description: fields.text({
          label: 'Описание (SEO)',
          description: 'Описание для поисковиков, до 160 символов',
          validation: { isRequired: true, length: { max: 160 } },
          multiline: true,
        }),
        pubDate: fields.date({
          label: 'Дата публикации',
          validation: { isRequired: true },
        }),
        updatedDate: fields.date({
          label: 'Дата обновления',
        }),
        draft: fields.checkbox({
          label: 'Черновик',
          description: 'Черновики не публикуются на сайте',
          defaultValue: false,
        }),
        author: fields.text({
          label: 'Автор',
          defaultValue: 'Upgrade',
        }),
        tags: fields.array(
          fields.text({ label: 'Тег' }),
          {
            label: 'Теги',
            itemLabel: (props) => props.value,
          },
        ),
        cover: fields.image({
          label: 'Обложка',
          directory: 'public/images/covers',
          publicPath: '/images/covers/',
          description: 'Рекомендуемый размер: 1200x630',
        }),
        canonical: fields.url({
          label: 'Canonical URL',
          description: 'Оставьте пустым для автоматического canonical',
        }),
        content: fields.markdoc({
          label: 'Содержание',
          options: {
            image: {
              directory: 'public/images/posts',
              publicPath: '/images/posts/',
            },
          },
        }),
      },
    }),
  },

  singletons: {
    settings: singleton({
      label: 'Настройки сайта',
      path: 'src/data/settings',
      schema: {
        siteName: fields.text({
          label: 'Название сайта',
          defaultValue: 'Upgrade',
        }),
        siteDescription: fields.text({
          label: 'Описание сайта',
          multiline: true,
          defaultValue: 'AI-агентство Upgrade - внедрение искусственного интеллекта в бизнес',
        }),
        siteUrl: fields.url({
          label: 'URL сайта',
          description: 'Основной домен',
        }),
        socialLinks: fields.array(
          fields.object({
            platform: fields.select({
              label: 'Платформа',
              options: [
                { value: 'telegram', label: 'Telegram' },
                { value: 'vk', label: 'ВКонтакте' },
                { value: 'youtube', label: 'YouTube' },
                { value: 'github', label: 'GitHub' },
              ],
              defaultValue: 'telegram',
            }),
            url: fields.url({ label: 'Ссылка' }),
          }),
          {
            label: 'Соцсети',
            itemLabel: (props) => props.fields.platform.value,
          },
        ),
      },
    }),
  },
});
