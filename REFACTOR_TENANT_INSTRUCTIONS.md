# Multi-Tenant Refactor Instructions

## 1. Context Replacements (`useTheme` and `useSettings` to `useTenant`)

For all components that use `useTheme` or `useSettings` (e.g. `MainLayout`, `DashboardLayout`, `Home`, `AdminTheme`, `AdminSettings`, `AdminOverview`, `DashboardHome`, `Contact`), make the following finding and replacement:

**Find:**
```tsx
import { useTheme } from '../contexts/ThemeContext';
import { useSettings } from '../contexts/SettingsContext';
```

**Replace with:**
```tsx
import { useTenant } from '../hooks/useTenant';
```

**Find:**
```tsx
const { settings } = useSettings();
const { theme } = useTheme();
```

**Replace with:**
```tsx
const { settings, theme } = useTenant();
```

## 2. API Queries Replacements (`tenant_id` filtering & inserting)

Inside hooks (e.g., `useForms`, `useDues`, `useFormResponses`, etc.) and any component doing direct `supabase` selects/inserts, we need to add `.eq('tenant_id', tenant.id)` for selects and `tenant_id: tenant.id` for inserts. 

You must import `useTenant` to get the current tenant details:

```ts
import { useTenant } from './useTenant';
// ...
const { tenant } = useTenant();
```

### Examples per query type

**Select Queries (Find & Replace):**

*Find:*
```ts
supabase.from('events').select('*')
```
*Replace with:*
```ts
supabase.from('events').select('*').eq('tenant_id', tenant.id)
```

**Insert Queries (Find & Replace):**

*Find:*
```ts
supabase.from('events').insert({ title, date, ... })
```
*Replace with:*
```ts
supabase.from('events').insert({ tenant_id: tenant.id, title, date, ... })
```

**Update Queries (Find & Replace):**

*Find:*
```ts
supabase.from('events').update({ title }).eq('id', id)
```
*Replace with:*
```ts
supabase.from('events').update({ title }).eq('id', id).eq('tenant_id', tenant.id)
```

**Delete Queries (Find & Replace):**

*Find:*
```ts
supabase.from('events').delete().eq('id', id)
```
*Replace with:*
```ts
supabase.from('events').delete().eq('id', id).eq('tenant_id', tenant.id)
```

### Hooks to update

Here are the hooks that require the above updates to all `.from('...')` calls:

- `src/hooks/useForms.ts`
- `src/hooks/useFormResponses.ts`
- `src/hooks/useDues.ts`
- `src/hooks/usePageContent.ts` (Already done!)

### Pages/Components to update

Any file calling `supabase.from` must also be tracked down and updated using `useTenant`:

```text
src/components/FeaturedProjects.tsx
src/pages/admin/AdminOverview.tsx
src/pages/admin/AdminContactInbox.tsx
src/pages/admin/AdminReminders.tsx
src/pages/admin/AdminSponsors.tsx
src/pages/admin/AdminAttendance.tsx
src/pages/admin/AdminGallery.tsx
src/pages/admin/AdminEvents.tsx
src/pages/admin/AdminCommunications.tsx
src/pages/admin/AdminProjects.tsx
src/pages/admin/AdminTheme.tsx
src/pages/admin/AdminResources.tsx
src/pages/admin/AdminNews.tsx
src/pages/admin/AdminMembers.tsx
src/pages/admin/AdminSettings.tsx
src/pages/admin/AdminPages.tsx
src/pages/admin/AdminBoard.tsx
src/pages/admin/AdminApplications.tsx
src/pages/dashboard/DashboardProfile.tsx
src/pages/dashboard/DashboardAttendance.tsx
src/pages/dashboard/DashboardProjects.tsx
src/pages/dashboard/DashboardAnnouncements.tsx
src/pages/dashboard/DashboardReminders.tsx
src/pages/dashboard/DashboardHome.tsx
src/pages/dashboard/DashboardResources.tsx
src/pages/dashboard/DashboardCalendar.tsx
src/pages/NewsDetail.tsx
src/pages/Board.tsx
src/pages/News.tsx
src/pages/ProjectDetail.tsx
src/pages/Home.tsx
src/pages/Sponsorship.tsx
src/pages/Events.tsx
src/pages/Projects.tsx
src/pages/About.tsx
src/pages/Contact.tsx
src/pages/Gallery.tsx
src/pages/Join.tsx
```

For every of the files above:
1. Append `import { useTenant } from '.../hooks/useTenant'`
2. Within the top-level of the component function, call `const { tenant } = useTenant();`
3. Modify all `.from(...)` and `.rpc(...)` calls to include `.eq('tenant_id', tenant.id)` for `.select()`, `.update()`, `.delete()`, and `{tenant_id: tenant.id}` for `.insert()` and `.upsert()`.

This ensures isolation of the two tenants structurally.
