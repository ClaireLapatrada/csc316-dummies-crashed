# 🚗 Dummies Crashed

## 📊 Project Overview
**Dummies Crashed** is a data-driven analysis of fatal traffic collisions in Toronto.  
Our goal is to identify key factors behind these crashes and provide actionable insights to help the city reduce future incidents—such as prioritizing road construction, fixing potholes, or installing speeding cameras.  
We will also create data visualizations to promote safe driving habits.

## 📂 Data Sources
We use publicly available traffic collision datasets from the [Toronto Police Service Public Safety Data Portal](https://data.torontopolice.on.ca/), primarily:
- **Killed and Seriously Injured (KSI) Collisions Dataset** – includes geographical information, road conditions, crash time/date, and demographic details.
- Other supporting datasets as needed.

---

## 👥 Team Members
| Name | Role | Email |
|------|------|------|
| **Janna** | Project Manager | janna.lim@mail.utoronto.ca |
| **Claire** | UI/UX Design, Front-End Development | claire.jaroonjetjumnong@mail.utoronto.ca |
| **Dechen** | UI/UX Design | de.zangmo@mail.utoronto.ca |
| **Viktoriia** | TBD | viktoriia.dyrda@mail.utoronto.ca |
| **Mitchell** | Data Engineer | mitchell.whitten@mail.utoronto.ca |
| **Sark** | UI/UX Design, Idea Generator | sark.asadourian@mail.utoronto.ca |

---

## 🤝 Team Agreement

### Communication
- **Channels:** Discord & Instagram  
- **Response Time:** Within 24 hours (preferably 4 hours during business hours, 9am–5pm EST).  
- **Urgent Matters:** Use `@channel` mentions.  
- **Meetings:** Thursdays at **2:15pm EST** at **Gerstein Library**.  
  - Each member gives a 2-minute status update.  
  - Meeting notes stored in a shared Google Doc.  
  - Attendance is mandatory (notify team lead 24 hrs in advance if absent).  

---

## 💻 Code Guidelines
- Follow the **Google JavaScript/HTML/CSS Style Guide**.  
- **Branch naming convention:** `[name]/[feature]`  
  - Example: `janna/home-page`
- Add **inline comments** for complex code.  
- Functions >20 lines must have **detailed docstrings**.  
- Comment any **workarounds or technical debt**.

---

## 🔀 Version Control Workflow

### Main Rules
- `main` branch is **protected** – no direct commits.
- Each member merges **their own feature branch** after review.
- Always create new branches from the **latest main**.

### Creating a Branch
```bash
# Ensure you're on main and up to date
git checkout main
git pull

# Create a new branch
git checkout -b name/feature
```

### Making Changes

Make your edits on your branch.

Pull updates to stay in sync:

```bash
git pull
```

Resolve any merge conflicts if needed.

Stage, commit, and push:

```bash
git add .
git commit -m "Describe your change"
git push origin name/feature
```

### Creating a Pull Request

1. Go to GitHub and click **Compare & pull request**.
2. Add two reviewers under the **Reviewers** tab.
3. Notify the team in Discord after opening the pull request.
