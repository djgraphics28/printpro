This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Printing POS

| Page | What it is |
| --- | --- |
| `/pos` | The counter screen: tap items, save the sale, see today's sales |
| `/pos/admin` | Admin only: all sales with filters and totals, edit, delete, export CSV, price list |
| `/pos/login` | One password box. The cashier password opens `/pos`; the admin password opens everything |

### Settings (`.env.local`)

Copy `.env.example` to `.env.local` and fill it in. Restart the app after changing it.

- `POS_CASHIER_PASSWORD` and `POS_ADMIN_PASSWORD` — the two logins. They must be different.
- `GOOGLE_SCRIPT_URL` and `GOOGLE_SCRIPT_SECRET` — the Google Sheet connection (below).
  While the URL is empty, sales are saved to files in `.data/` on this computer so you
  can still try everything.

### Connect Google Sheets

The site talks to your sheet through a small Apps Script that lives inside the sheet.
No Google Cloud project or key file is needed.

1. Create a Google Sheet, then open **Extensions → Apps Script**.
2. Delete what is in the editor and paste all of **`google-apps-script/Code.gs`** from this project.
3. Replace the placeholder at the top with the value of `GOOGLE_SCRIPT_SECRET` from `.env.local`:

   ```js
   const SECRET = "your-long-random-secret";
   ```

4. Click **Deploy → New deployment**. Click the gear → **Web app**. Set
   **Execute as: Me** and **Who has access: Anyone**, then **Deploy**.
   Google asks you to authorize the script the first time. If it says the app
   isn't verified, click **Advanced → Go to (project name)** and allow it.
5. Copy the **Web app URL** (it ends with `/exec`) into `.env.local`:

   ```bash
   GOOGLE_SCRIPT_URL=https://script.google.com/macros/s/.../exec
   ```

6. Restart. `/pos/admin` tests the connection each time it loads and says
   **Google Sheets connected**, or tells you what to fix. The `Sales` tab is created
   on the first sale and the `Services` tab the first time the price list is saved.

If you change the script later, publish it with **Deploy → Manage deployments →
edit (pencil) → Version: New version → Deploy**. That keeps the same URL.

Anyone who has both the URL and the secret can read and change the sales,
so keep `.env.local` private and never commit it.

On a host like Vercel, add the same variables in the project's environment settings.
Google Sheets must be connected there (the local file is only for development).

## Sari-Sari Store daily sales

A separate tool with its own logins, for writing down the store's whole sales of
each day in five categories: GCash, Groceries, Softdrinks, Ice and Eggs. It is a
simple daily sheet, not a point of sale: one amount per category per day.

| Page | What it is |
| --- | --- |
| `/store` | Type the day's total per category and save. Saving the same day again replaces it |
| `/store/admin` | Admin only: every day with totals, add, edit, delete, export CSV |
| `/store/login` | One password box. The cashier password opens `/store`; the admin password opens everything |

- `STORE_POS_CASHIER_PASSWORD` and `STORE_POS_ADMIN_PASSWORD` in `.env.local` — the two
  store logins. They must be different from each other. The Printing POS passwords
  don't open the store, and the store passwords don't open the Printing POS.
- The sales go to a `Store Daily Sales` tab in the same Google Sheet (created on the
  first save), one row per day, or to `.data/store-daily.json` while Google Sheets is
  not connected.
- The cashier can enter or correct today and the 6 days before. The admin can enter
  any past date.

The store needs the current `google-apps-script/Code.gs`. If your script was deployed
before the store was added, paste the file again (keep your `SECRET` line) and publish
a new version as described above.
