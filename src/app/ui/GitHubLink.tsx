import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { SiGithub } from '@icons-pack/react-simple-icons'
import Link from 'next/link'

interface GitHubLinkProps {
  href: string
}

export function GitHubLink({ href }: GitHubLinkProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button asChild variant="ghost">
          <Link href={href}>
            <SiGithub className="size-5 sm:size-4" />
          </Link>
        </Button>
      </TooltipTrigger>
      <TooltipContent>View repo on GitHub</TooltipContent>
    </Tooltip>
  )
}
