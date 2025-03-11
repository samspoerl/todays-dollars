import PageWrapper from '@/components/PageWrapper'
import { Body, H1, H3 } from '@/components/typography'

const externalLinkStyle = 'underline underline-offset-5 visited:text-purple-800'

export default function AboutPage() {
  return (
    <PageWrapper>
      <H1>About</H1>
      <H3>Purpose</H3>
      <Body>
        This app aims to answer the question: &quot;How much is that in
        today&apos;s dollars?&quot; For example: &quot;How much would $100 in
        1975 be worth in today&apos;s dollars?&quot;
      </Body>
      <H3>Stack</H3>
      <ul className="ml-6 list-disc space-y-2">
        <li>
          <a href="https://nextjs.org/" className={externalLinkStyle}>
            Next.js 15
          </a>
        </li>
        <li>
          <a href="https://tailwindcss.com/" className={externalLinkStyle}>
            Tailwind CSS v4
          </a>
        </li>
        <li>
          <a href="https://ui.shadcn.com/" className={externalLinkStyle}>
            Shadcn
          </a>
        </li>
        <li>
          <a href="https://upstash.com/" className={externalLinkStyle}>
            Upstash for Redis
          </a>
        </li>
        <li>
          <a href="https://vercel.com/" className={externalLinkStyle}>
            Vercel
          </a>
        </li>
      </ul>
      <H3>Data</H3>
      <Body>
        Historical inflation data is obtained from the Federal Reserve Bank of
        St. Louis (
        <a href="https://fred.stlouisfed.org/" className={externalLinkStyle}>
          FRED
        </a>
        ) API:
      </Body>
      <ul className="ml-6 list-disc space-y-2">
        <li>
          Consumer Price Index (
          <a
            href="https://fred.stlouisfed.org/series/CPIAUCSL"
            className={externalLinkStyle}
          >
            CPI
          </a>
          )
        </li>
        <li>
          Personal Consumption Expenditures Price Index (
          <a
            href="https://fred.stlouisfed.org/series/PCEPI"
            className={externalLinkStyle}
          >
            PCE
          </a>
          )
        </li>
      </ul>
    </PageWrapper>
  )
}
