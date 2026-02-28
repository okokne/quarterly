import re

with open("src/components/StatsView.tsx", "r", "utf-8") as f:
    stats = f.read()

stats = stats.replace('stroke="#F43F5E"', 'stroke="var(--color-accent-base)"')
stats = stats.replace('stopColor="#F43F5E"', 'stopColor="var(--color-accent-base)"')
stats = stats.replace('stopColor="#BE123C"', 'stopColor="var(--color-accent-hover)"')

with open("src/components/StatsView.tsx", "w", "utf-8") as f:
    f.write(stats)


with open("src/utils/weeklyTargetAccents.ts", "r", "utf-8") as f:
    accents = f.read()

accents = accents.replace('"#F43F5E", // Ruby', '"#0070F3", // Vercel Blue')

with open("src/utils/weeklyTargetAccents.ts", "w", "utf-8") as f:
    f.write(accents)

