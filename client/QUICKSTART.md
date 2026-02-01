# RAT - Quick Client Setup Guide

## 🚀 Quick Start (5 minutes)

### Step 1: Install Dependencies

```bash
cd rat
pnpm install
```

### Step 2: Configure API

Create `.env.local` file:

```bash
NEXT_PUBLIC_API_BASE=http://localhost:4000
```

Replace with your actual API endpoint URL.

### Step 3: Run Development Server

```bash
pnpm run dev
```

Visit http://localhost:3000

## 📋 What You Get

✅ **Complete Next.js 14 App** - Fully typed TypeScript codebase
✅ **Beautiful UI** - DaisyUI components with light/dark mode
✅ **State Management** - Zustand store handling all server state
✅ **API Integration** - All 25+ controller endpoints wired
✅ **Analytics Dashboard** - Charts for clicks, devices, geography
✅ **Responsive Design** - Works on mobile, tablet, desktop

## 🎯 Key Pages

- `/` - Projects list
- `/projects/new` - Create project
- `/projects/[id]` - Project detail (campaigns + analytics tabs)
- `/projects/[id]/campaigns/new` - Create campaign
- `/projects/[id]/campaigns/[id]` - Campaign links
- `/projects/[id]/campaigns/[id]/links/new` - Add manual link
- `/projects/[id]/campaigns/[id]/links/[slug]` - Link analytics

## 🛠 Tech Stack

- Next.js 14 (App Router)
- TypeScript
- TailwindCSS + DaisyUI
- Zustand (state)
- Recharts (charts)
- Axios (HTTP)
- lucide-react (icons)

## 📝 Notes

- No authentication required (personal use)
- Backend API must be running
- All API calls go through `lib/api.ts`
- State managed by `stores/useProjectStore.ts`
- Theme toggles in sidebar (persists to localStorage)

## 🎨 Customization

### Change Primary Color

Edit `tailwind.config.ts`:

```typescript
primary: "#0ea5e9", // If you want to change primary color
```

### Add New Analytics

1. Add endpoint to `lib/api.ts`
2. Use in component with `useEffect`
3. Display with Recharts

## 🐛 Troubleshooting

**API Errors**: Ensure backend is running and `NEXT_PUBLIC_API_BASE` is correct
**Build Errors**: Run `pnpm install` again
**Missing Data**: Check browser console for API response errors

## 📦 Production Build

```bash
pnpm run build
pnpm start
```

## 🎉 You're Ready!

Start by creating your first project at http://localhost:3000
