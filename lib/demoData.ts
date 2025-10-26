import { Note, Collection, SmartCollection, Template } from '../types';

const now = new Date();
const yesterday = new Date(now);
yesterday.setDate(now.getDate() - 1);
const twoDaysAgo = new Date(now);
twoDaysAgo.setDate(now.getDate() - 2);

export const demoNotes: Note[] = [
  {
    id: 'demo-note-1',
    title: 'Welcome to WesCore!',
    content: `## Welcome to your Demo Workspace!

This is a **live, interactive demo** of WesCore. You can write, edit, create new notes, and explore all the UI features.

**What to try:**
- Create a new note using the "New Note" button.
- Edit this note! Your changes will be reflected locally.
- Use the slash command menu by typing \`/\`.
- Link to another note by typing \`[[...]]\`. Here's a link to the marketing plan: [[demo-note-2|Q3 Marketing Plan]].
- Explore the **Graph View** and other dashboards using the icons in the bottom-left.

> [!NOTE]
> This is a callout block! You can use \`[!NOTE]\`, \`[!TIP]\`, \`[!IMPORTANT]\`, \`[!WARNING]\`, and \`[!CAUTION]\` to highlight information.

*Note: This is a demo environment. Your changes will not be saved when you refresh the page.*`,
    createdAt: twoDaysAgo.toISOString(),
    updatedAt: twoDaysAgo.toISOString(),
    isFavorite: true,
    tags: ['welcome', 'getting-started'],
    history: [],
    parentId: null,
  },
  {
    id: 'demo-note-2',
    title: 'Q3 Marketing Plan',
    content: `### Q3 Marketing Initiatives

Our focus for Q3 is on organic growth and content marketing.

**Key Pillars:**
1.  **Blog Content:** Publish two high-quality articles per week.
    - Focus on SEO keywords related to "AI productivity" and "workflow automation".
2.  **Social Media:** Increase engagement on Twitter and LinkedIn.
    - Share snippets from blog posts.
    - Post one short video tutorial each week.
3.  **Newsletter:** Grow our subscriber list by 20%.
    - Offer a free e-book as a lead magnet.

See the [[demo-note-3]] for a list of potential blog topics.
`,
    createdAt: yesterday.toISOString(),
    updatedAt: now.toISOString(),
    isFavorite: false,
    tags: ['marketing', 'q3', 'planning'],
    history: [],
    parentId: 'demo-collection-1',
  },
  {
    id: 'demo-note-3',
    title: 'Blog Topic Ideas',
    content: `- 5 Ways AI Can Automate Your E-commerce Business
- The Ultimate Guide to Building a Second Brain
- From Chaos to Control: A Founder's Journey with WesCore
- How to Use Bi-directional Linking to Uncover Hidden Insights`,
    createdAt: yesterday.toISOString(),
    updatedAt: yesterday.toISOString(),
    isFavorite: false,
    tags: ['content', 'ideas', 'blogging'],
    history: [],
    parentId: 'demo-collection-1',
  },
  {
    id: 'demo-note-4',
    title: 'QA for New Feature',
    content: `### Pre-launch QA Checklist

Here is the standard checklist for all new feature launches.

[[sync:demo-template-2]]

**Additional tests for this feature:**
- Check performance with over 1000 notes.
`,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    isFavorite: false,
    tags: ['qa', 'process'],
    history: [],
    parentId: 'demo-collection-1',
  }
];

export const demoCollections: Collection[] = [
    { id: 'demo-collection-1', name: 'Projects', userId: 'demo-user', parentId: null },
];

export const demoSmartCollections: SmartCollection[] = [
    { id: 'demo-sc-1', name: 'Marketing Notes', userId: 'demo-user', query: 'all notes related to marketing strategy' },
];

export const demoTemplates: Template[] = [
    { id: 'demo-template-1', title: 'Meeting Minutes', content: '## Meeting Minutes\n\n**Date:**\n**Attendees:**\n\n### Agenda\n\n- \n\n### Discussion\n\n-\n\n### Action Items\n\n- [ ] ' },
    { id: 'demo-template-2', title: 'Standard QA Checklist', content: '- [ ] Test on Chrome\n- [ ] Test on Mobile (iOS & Android)\n- [ ] Check for accessibility issues\n- [ ] Verify in both light and dark mode' },
];
