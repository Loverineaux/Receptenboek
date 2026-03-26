'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Wand2, Search, Users } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import Button from '@/components/ui/Button'

const features = [
  {
    icon: Wand2,
    title: 'AI Extractie',
    description:
      'Plak een URL of foto en laat AI automatisch de ingredienten en stappen extraheren.',
  },
  {
    icon: Search,
    title: 'Slim Zoeken',
    description:
      'Zoek op ingredienten, keuken, bereidingstijd of dieetwensen. Vind altijd het juiste recept.',
  },
  {
    icon: Users,
    title: 'Delen & Ontdekken',
    description:
      'Deel je favoriete recepten met vrienden en ontdek nieuwe gerechten van anderen.',
  },
]

export default function HomePage() {
  const router = useRouter()
  const { user, loading } = useAuth()

  useEffect(() => {
    if (!loading && user) {
      router.push('/recepten')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (user) return null

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="flex flex-col items-center justify-center px-4 pt-24 pb-16 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-text-primary sm:text-5xl md:text-6xl">
          Recept
          <span className="text-primary">enboek</span>
        </h1>
        <p className="mt-4 max-w-lg text-lg text-text-secondary">
          Al je favoriete recepten op één plek
        </p>
        <Link href="/login">
          <Button variant="primary" size="lg" className="mt-8">
            Aan de slag
          </Button>
        </Link>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-5xl px-4 py-16">
        <div className="grid gap-8 sm:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border border-gray-100 bg-surface p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary-light">
                <feature.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-text-primary">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 text-center text-sm text-text-muted">
        Receptenboek &mdash; Jouw digitale kookboek
      </footer>
    </div>
  )
}
