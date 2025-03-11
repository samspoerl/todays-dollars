## Purpose

This app aims to answer the question: "How much is that in today's dollars?" For example: "How much would $100 in 1975 be worth in today's dollars?"

## Stack

- [Next.js 15](https://nextjs.org/)
- [Tailwind CSS v4](https://tailwindcss.com/)
- [Shadcn](https://ui.shadcn.com/)
- [Upstash for Redis](https://upstash.com/)
- [Vercel](https://vercel.com/)

## Data

Historical inflation data is obtained from the Federal Reserve Bank of St. Louis ([FRED](https://fred.stlouisfed.org/)) API:

- Consumer Price Index ([CPI](https://fred.stlouisfed.org/series/CPIAUCSL))
- Personal Consumption Expenditures Price Index ([PCE](https://fred.stlouisfed.org/series/PCEPI))
