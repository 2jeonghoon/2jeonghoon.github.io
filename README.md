# JH.LOG

게임 클라이언트, 서버 아키텍처, Linux I/O에 관한 이정훈의 개발 블로그입니다.

## 블로그 운영 가이드

### 새 글 작성과 미리보기

글의 원본은 `posts/` 안의 Markdown 파일입니다. 템플릿을 복사한 다음 내용을
수정하세요.

```bash
cp posts/_template.md.example posts/my-new-post.md
npm run test:blog
npm run build:blog -- --sync-preview
python3 -m http.server 4173 -d _site
```

브라우저에서 `http://localhost:4173`을 열면 실제 배포물과 같은 결과를 확인할 수
있습니다. 글 상세 주소는 `?post=my-new-post` 형식입니다.

파일명에서 `.md`를 뺀 값이 글의 고유한 `slug`가 됩니다. 영문 소문자, 숫자,
하이픈만 사용할 수 있으며 게시 후 파일명을 바꾸면 글 주소와 댓글 연결도
달라지므로 그대로 유지해야 합니다. `_template.md.example`은 확장자가 정확히
`.md`가 아니어서 빌드 대상에 포함되지 않습니다.

### Front matter 필드

- `title`: 글 제목
- `description`: 목록, 검색 결과, RSS에 표시할 요약
- `date`: `YYYY-MM-DD` 형식의 게시일
- `category`: 하나의 카테고리 이름
- `tags`: 하나 이상의 태그 배열
- `readingTime`: 선택 사항인 예상 읽기 시간. 생략하면 자동 계산됩니다.
- `image`: 선택 사항인 대표 이미지 경로. `assets/...`처럼 저장소 루트 기준의
  상대 경로만 사용할 수 있습니다.
- `featured`: 대표 글 후보 여부. 여러 글이 `true`이면 가장 최근 글이 선택되고,
  하나도 없으면 전체 글 중 가장 최근 글이 선택됩니다.
- `draft`: `true`이면 목록, 검색, 직접 글 데이터, RSS, 사이트맵에서 모두 제외됩니다.
- `aiGenerated`: Agent가 제공된 정보를 바탕으로 작성한 글이면 `true`로 설정합니다.
  이때 글 아래에 `이 글은 Agent가 제공된 정보를 기반으로 작성했습니다.`라는
  문구가 자동으로 표시됩니다. 실제 작성 방식과 일치하도록 정확히 설정하세요.

Markdown 안에서는 HTML이 실행되지 않습니다. 이미지는 먼저 `assets/`에 추가한 뒤
`![설명](assets/파일명.png)` 형식으로 참조하세요.

### GitHub에서 게시하기

GitHub 웹 화면에서도 `posts/*.md`를 추가하거나 수정할 수 있습니다. 먼저
`_template.md.example`의 내용을 복사하고, `draft: false`로 바꾼 뒤 `main` 브랜치에
커밋하세요. GitHub Actions의 Pages 워크플로가 테스트와 빌드를 통과한 결과만
`_site/` 배포물로 게시합니다. 로컬에서 만든 `posts.js`, `feed.xml`, `sitemap.xml`은
`--sync-preview`가 갱신하며, 게시 시에도 워크플로가 다시 생성합니다.

### 댓글 관리

방문자는 각 글 아래의 Giscus에서 GitHub 계정으로 댓글과 답글을 남길 수 있습니다.
댓글은 이 저장소의 GitHub Discussions 안 `Blog Comments` 카테고리에 저장되므로
그곳에서 수정, 숨김, 잠금, 삭제 등 관리 작업을 할 수 있습니다. 글 파일을
삭제해도 연결된 Discussion은 자동으로 삭제되지 않으므로 필요하면 GitHub에서
별도로 정리하세요.

---

## Legacy React portfolio

아래 내용과 `src/` 디렉터리는 이전 React 포트폴리오 구현에 관한 기록입니다. 현재 GitHub Pages는 저장소 루트의 정적 블로그를 사용합니다.

# Software Developer Folio ⚡️ [![GitHub](https://img.shields.io/github/license/saadpasta/developer-portfolio?color=blue)](https://github.com/saadpasta/developerFolio/blob/master/LICENSE)

## A clean, beautiful and responsive portfolio template for Developers!


<p align="center">
  <kbd>
<img src="https://user-images.githubusercontent.com/53429438/106779355-e9cd9e80-666c-11eb-9417-8a4b54441bc6.gif"></img>
  </kbd>
</p>


Just change `src/portfolio.js` to get your personal portfolio. Customize portfolio theme by using your own color scheme globally in the  `src/_globalColor.scss` file. Feel free to use it as-is or personalize it as much as you want.

If you'd like to **contribute** and make this much better for other users, have a look at [Issues](https://github.com/saadpasta/developerFolio/issues).

Created something awesome for your fork of the portfolio and want to share it? Feel free to open a [pull request](https://github.com/saadpasta/developerFolio/pulls).

## Table of Contents
- [Sections](#sections)
- [Getting Started](#getting-started)
- [How to Use](#how-to-use)
- [Linking portfolio to GitHub](#linking-portfolio-to-github)
- [Linking blogs section to Medium](#linking-blogs-section-to-medium)
- [Change and Customize](#change-and-customize-every-section-according-to-your-need)
- [Deployment](#deployment)
- [Technologies Used](#technologies-used)
- [Illustrations](#illustrations)
- [For the Future](#for-the-future)
- [Contributors](#project-maintainers)

## Portfolio Sections
✔️ Summary and About me\
✔️ Skills\
✔️ Education\
✔️ Work Experience\
✔️ Open Source Projects Connected with GitHub\
✔️ Big Projects\
✔️ Achievements And Certifications 🏆\
✔️ Blogs\
✔️ Talks\
✔️ Podcast\
✔️ Contact me\
✔️ Twitter Timeline\
✔️ GitHub Profile

To view a live example, **[click here](https://developerfolio.js.org/)**.


## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

You'll need [Git](https://git-scm.com) and [Node.js](https://nodejs.org/en/download/) (which comes with [npm](http://npmjs.com)) installed on your computer or use [Docker](https://www.docker.com/products/docker-desktop).

```
node@v10.16.0 or higher
npm@6.9.0 or higher
git@2.17.1 or higher
```
### Docker Commands

```
1) BUILD IMAGE : docker build -t developerfolio:latest .
2) RUN IMAGE: docker run -t -p 3000:3000 developerfolio:latest
```


## How To Use 

From your command line, clone and run developerFolio:

```bash
# Clone this repository
git clone https://github.com/saadpasta/developerFolio.git

# Go into the repository
cd developerFolio

# Setup default environment variables

# For Linux
cp env.example .env
# For Windows
copy env.example .env

# Install dependencies
npm install

# Start a local dev server
npm start
```

## Linking Portfolio to GitHub

Generate a classic GitHub personal access token following these [instructions](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token#creating-a-personal-access-token-classic) (make sure you don't select any scope just generate a simple token). If you are using [GitHub Actions](#configuring-github-actions-recommended) to deploy your portfolio you can skip this section.

1. Create a file called .env in the root directory of your project (if not done already in section: [How To Use](#how-to-use))

Note: Configuring environment variables before deploying your portfolio is highly recommended as some components depend on API data. 

```bash
- DeveloperFolio
  - node_modules
  - public
  - src
  - .env         <-- create it here
  - env.example  <-- this is the base file
  - .gitignore
  - package-lock.json
  - package.json
```

2. Inside the .env file, add key `REACT_APP_GITHUB_TOKEN` and assign your GitHub token like this, also add your username as `GITHUB_USERNAME`

```env
// .env
REACT_APP_GITHUB_TOKEN = "YOUR GITHUB TOKEN HERE"
GITHUB_USERNAME = "YOUR GITHUB USERNAME"
USE_GITHUB_DATA = "true"
```

Set `showGithubProfile` to true or false to show Contact Profile using GitHub, defaults to false.

**Warning:** Treat your tokens like passwords and keep them secret. When working with the API, use tokens as environment variables instead of hardcoding them into your programs.

Note: Open Source Projects section only show pinned items of your GitHub.
If you are seeing something as shown below, follow these [instructions](https://docs.github.com/en/enterprise/2.13/user/articles/pinning-items-to-your-profile).

![ERROR](https://i.imgur.com/Hj6mu1K.png)

If the above solution still doesn't work, visit the [wiki page](https://github.com/saadpasta/developerFolio/wiki/Github-Setup-For-Open-Source-Projects).

## Linking blogs section to Medium

Optionally, you can link the blogs section to your medium user account:

* Inside the .env file, add key `MEDIUM_USERNAME` and assign your Medium username

```env
// .env
MEDIUM_USERNAME = "YOUR MEDIUM USERNAME"
```

* For Github Action, change the environment variable `MEDIUM_USERNAME` in `.github/workflows/deploy.yml`

Set `displayMediumBlogs` to true or false in portofolio.js to display fetched Medium blogs, defaults to true.

## Change and customize every section according to your need.

#### Personalize page content in `/src/portfolio.js` & modify it as per your need. You will also need to modify `index.html` to change the title and metadata to provide accurate SEO for your personal portfolio.

```javascript
/* Change this file to get your Personal Porfolio */

const greeting = {
  /* Your Summary And Greeting Section */
  title: "Hi all I'm Saad",
  subTitle: emoji("A passionate Full Stack Software Developer 🚀"),
  resumeLink: "https://drive.google.com/file/d/1ofFdKF_mqscH8WvXkSObnVvC9kK7Ldlu/view?usp=sharing"
};

const socialMediaLinks = {
  /* Your Social Media Link */
  github: "https://github.com/saadpasta",
  linkedin: "https://www.linkedin.com/in/saadpasta/",
  gmail: "saadpasta70@gmail.com",
  gitlab: "https://gitlab.com/saadpasta",
  facebook: "https://www.facebook.com/saad.pasta7"
};


const skillsSection = { .... }

const techStack = { .... }

const workExperience = { .... }

const openSource = { .... }

const bigProjects = { .... }

const achievementSection = { .... }

const blogSection = { .... }

const contactInfo = { .... }

const twitterDetails = { ... }

```
#### Resume upload
To upload your own resume, simply upload a pdf to `src/containers/greeting/resume` and rename the pdf to `resume.pdf`. 

#### Using Emojis

For adding emoji 😃 into the texts in `Portfolio.js`, use the `emoji()` function and pass the text you need as an argument. This would help in keeping emojis compatible across different browsers and platforms.

#### Customize Lottie Animations

You can choose a Lottie and download it in json format from sites like [this](https://lottiefiles.com/). In `src/assets/lottie`, replace the Lottie json file you want to alter with the same file name. If you want to change the Lottie options, go to `src/components/displayLottie/DisplayLottie.js` and change the `defaultOptions` object, you can refer [lottie-react docs](https://www.npmjs.com/package/lottie-react) for more info on the `defaultOptions` object.

#### Adding Twitter Time line to your Page
Insert your Twitter username in `portfolio.js` to show your recent activity on your page.

```javascript
const twitterDetails = {
  userName : "Your Twitter Username"
};
```
Note: Don't use `@` symbol when adding username.

## Deployment
When you are done with the setup, you should host your website online.
We highly recommend to read through the [Deploying on GitHub Pages](https://create-react-app.dev/docs/deployment/#github-pages) docs for React.

#### Configuring GitHub Actions (Recommended)
First you should enable, GitHub Actions for the repository you use.

The Profile and the Repository information from GitHub is only created at the time of deploy and the site needs to be redeployed if those information needs to be updated. So, a configurable [CRON Job](https://docs.github.com/en/actions/reference/events-that-trigger-workflows#scheduled-events) is setup which deploys your site every week, so that once you update your profile on GitHub it is shown on your portfolio. You can also trigger it manually using `workflow_dispatch` event, see [this guide](https://github.blog/changelog/2020-07-06-github-actions-manual-triggers-with-workflow_dispatch) on how to do that.

- When you are done with the configuration, we highly recommend to read through the [GitHub Actions Configuring a workflow](https://docs.github.com/en/actions/configuring-and-managing-workflows/configuring-a-workflow) docs.

#### Deploying to GitHub Pages

This section guides you to deploy your portfolio on GitHub pages.

- Navigate to `package.json` and enter your domain name instead of `https://developerfolio.js.org/` in `homepage` variable. For example, if you want your site to be `https://<your-username>.github.io/developerFolio`, add the same to the homepage section of `package.json`.

- In short you can also add `/devloperFolio` to `package.json` as both are exactly same. Upon doing so, you tell `create-react-app` to add the path assets accordingly.

- Optionally, configure the domain. You can configure a custom domain with GitHub Pages by adding a `CNAME` file to the `public/` folder.

- Follow through the guide to setup GitHub pages from the official CRA docs [here](https://create-react-app.dev/docs/deployment/#github-pages).

#### Deploying to Netlify

You could also host directly with Netlify by linking your own repository.

[![Deploy To Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/saadpasta/developerFolio)

For more information, read [hosting on Netlify](https://create-react-app.dev/docs/deployment/#netlify).


## Technologies Used 

- [React](https://reactjs.org/)
- [graphql](https://graphql.org/)
- [apollo-boost](https://www.apollographql.com/docs/react/get-started/)
- [react-twitter-embed](https://github.com/saurabhnemade/react-twitter-embed)
- [react-easy-emoji](https://github.com/appfigures/react-easy-emoji)
- [react-headroom](https://github.com/KyleAMathews/react-headroom)
- [color-thief](https://github.com/lokesh/color-thief)

## Illustrations
- [UnDraw](https://undraw.co/illustrations)
- [Lottie by Oblikweare](https://lottiefiles.com/oblikweare)


## For the Future
If you can help us with these. Please don't hesitate to open a [pull request](https://github.com/saadpasta/developerFolio/pulls).

- Connect with LinkedIn to get Summary, Skills, Education and Experience

- Move to Gatsby

- Add More Sections

## Project Maintainers 

<table>
  <tr>
    <td align="center"><a href="http://saadpasta.github.io"><img src="https://avatars2.githubusercontent.com/u/23307811?v=4" width="100px;" alt=""/><br /><sub><b>Saad Pasta</b></sub></a></td>
    <td align="center"><a href="https://github.com/kartikcho"><img src="https://avatars1.githubusercontent.com/u/48270786?v=4" width="100px;" alt=""/><br /><sub><b>Kartik Choudhary</b></sub></a></td>
    <td align="center"><a href="https://github.com/naveen521kk"><img src="https://avatars1.githubusercontent.com/u/49693820?v=4" width="100px;" alt=""/><br /><sub><b>Naveen M K</b></sub></a></td>
    <td align="center"><a href="http://www.muhammadhasham.com"><img src="https://avatars0.githubusercontent.com/u/17927649?v=4" width="100px;" alt=""/><br /><sub><b>Muhammad Hasham</b></sub></a></td>
  </tr>
</table>

## Contributors 

Thanks goes to these wonderful people ([emoji key](https://allcontributors.org/docs/en/emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tbody>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="http://facebook.com/9inpachi"><img src="https://avatars2.githubusercontent.com/u/36920441?v=4?s=100" width="100px;" alt="Fawad Ali"/><br /><sub><b>Fawad Ali</b></sub></a><br /><a href="#ideas-9inpachi" title="Ideas, Planning, & Feedback">🤔</a> <a href="https://github.com/saadpasta/developerFolio/commits?author=9inpachi" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://dasunnavoda.wordpress.com/"><img src="https://avatars0.githubusercontent.com/u/5556085?v=4?s=100" width="100px;" alt="Dasun Navoda"/><br /><sub><b>Dasun Navoda</b></sub></a><br /><a href="https://github.com/saadpasta/developerFolio/commits?author=IamDZN" title="Documentation">📖</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://brian.teeman.net"><img src="https://avatars3.githubusercontent.com/u/1296369?v=4?s=100" width="100px;" alt="Brian Teeman"/><br /><sub><b>Brian Teeman</b></sub></a><br /><a href="https://github.com/saadpasta/developerFolio/commits?author=brianteeman" title="Documentation">📖</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://rajkumaar.co.in"><img src="https://avatars1.githubusercontent.com/u/37476886?v=4?s=100" width="100px;" alt="Rajkumar S"/><br /><sub><b>Rajkumar S</b></sub></a><br /><a href="https://github.com/saadpasta/developerFolio/commits?author=rajkumaar23" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/viveksharmaui"><img src="https://avatars1.githubusercontent.com/u/28563357?v=4?s=100" width="100px;" alt="Slim Coder"/><br /><sub><b>Slim Coder</b></sub></a><br /><a href="https://github.com/saadpasta/developerFolio/commits?author=viveksharmaui" title="Code">💻</a> <a href="https://github.com/saadpasta/developerFolio/commits?author=viveksharmaui" title="Documentation">📖</a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://msayyaf.com"><img src="https://avatars3.githubusercontent.com/u/22149734?v=4?s=100" width="100px;" alt="Mohamed Sayyaf"/><br /><sub><b>Mohamed Sayyaf</b></sub></a><br /><a href="https://github.com/saadpasta/developerFolio/commits?author=msayyaf1" title="Documentation">📖</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://ashutosh1919.github.io"><img src="https://avatars3.githubusercontent.com/u/20843596?v=4?s=100" width="100px;" alt="Ashutosh Hathidara"/><br /><sub><b>Ashutosh Hathidara</b></sub></a><br /><a href="https://github.com/saadpasta/developerFolio/commits?author=ashutosh1919" title="Code">💻</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://www.upwork.com/freelancers/~01d10c23d4ffe3c658"><img src="https://avatars0.githubusercontent.com/u/8683960?v=4?s=100" width="100px;" alt="Rizwan Jamal ⚡️"/><br /><sub><b>Rizwan Jamal ⚡️</b></sub></a><br /><a href="https://github.com/saadpasta/developerFolio/commits?author=Rizwanjamal" title="Documentation">📖</a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://www.muhammadhasham.com"><img src="https://avatars0.githubusercontent.com/u/17927649?v=4?s=100" width="100px;" alt="Muhammad Hasham"/><br /><sub><b>Muhammad Hasham</b></sub></a><br /><a href="https://github.com/saadpasta/developerFolio/commits?author=MohammadHasham" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://sourcerer.io/joshiujjawal22"><img src="https://avatars3.githubusercontent.com/u/44023234?v=4?s=100" width="100px;" alt="UJJAWAL JOSHI"/><br /><sub><b>UJJAWAL JOSHI</b></sub></a><br /><a href="https://github.com/saadpasta/developerFolio/commits?author=joshiujjawal22" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/palak-sethi"><img src="https://avatars2.githubusercontent.com/u/51605219?v=4?s=100" width="100px;" alt="Palak Sethi"/><br /><sub><b>Palak Sethi</b></sub></a><br /><a href="https://github.com/saadpasta/developerFolio/commits?author=palak-sethi" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://viniciusbds.github.io/"><img src="https://avatars3.githubusercontent.com/u/34755896?v=4?s=100" width="100px;" alt="Vinicius Barbosa"/><br /><sub><b>Vinicius Barbosa</b></sub></a><br /><a href="https://github.com/saadpasta/developerFolio/commits?author=viniciusbds" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://bharatkammakatla.github.io"><img src="https://avatars1.githubusercontent.com/u/28840761?v=4?s=100" width="100px;" alt="Bharat Kammakatla"/><br /><sub><b>Bharat Kammakatla</b></sub></a><br /><a href="#design-BharatKammakatla" title="Design">🎨</a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://bit.ly/garimasingh"><img src="https://avatars2.githubusercontent.com/u/44302373?v=4?s=100" width="100px;" alt="Garima Singh"/><br /><sub><b>Garima Singh</b></sub></a><br /><a href="https://github.com/saadpasta/developerFolio/commits?author=garimasingh128" title="Code">💻</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/HenryHengZJ"><img src="https://avatars2.githubusercontent.com/u/26460777?v=4?s=100" width="100px;" alt="Henry Heng"/><br /><sub><b>Henry Heng</b></sub></a><br /><a href="https://github.com/saadpasta/developerFolio/commits?author=HenryHengZJ" title="Code">💻</a> <a href="#design-HenryHengZJ" title="Design">🎨</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/PulkitBanta"><img src="https://avatars2.githubusercontent.com/u/43134750?v=4?s=100" width="100px;" alt="Pulkit Banta"/><br /><sub><b>Pulkit Banta</b></sub></a><br /><a href="https://github.com/saadpasta/developerFolio/commits?author=PulkitBanta" title="Code">💻</a> <a href="https://github.com/saadpasta/developerFolio/issues?q=author%3APulkitBanta" title="Bug reports">🐛</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/AkshayCHD"><img src="https://avatars1.githubusercontent.com/u/25455546?v=4?s=100" width="100px;" alt="Akshay Kumar"/><br /><sub><b>Akshay Kumar</b></sub></a><br /><a href="https://github.com/saadpasta/developerFolio/commits?author=AkshayCHD" title="Code">💻</a> <a href="https://github.com/saadpasta/developerFolio/issues?q=author%3AAkshayCHD" title="Bug reports">🐛</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/AmnaEjaz"><img src="https://avatars3.githubusercontent.com/u/14257959?v=4?s=100" width="100px;" alt="Amna Ejaz"/><br /><sub><b>Amna Ejaz</b></sub></a><br /><a href="https://github.com/saadpasta/developerFolio/commits?author=AmnaEjaz" title="Code">💻</a> <a href="#ideas-AmnaEjaz" title="Ideas, Planning, & Feedback">🤔</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/parasnagpal"><img src="https://avatars0.githubusercontent.com/u/39419139?v=4?s=100" width="100px;" alt="Paras Nagpal"/><br /><sub><b>Paras Nagpal</b></sub></a><br /><a href="https://github.com/saadpasta/developerFolio/commits?author=parasnagpal" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://sourcerer.io/sparsh-99"><img src="https://avatars0.githubusercontent.com/u/56729873?v=4?s=100" width="100px;" alt="Sparsh Garg"/><br /><sub><b>Sparsh Garg</b></sub></a><br /><a href="https://github.com/saadpasta/developerFolio/commits?author=sparsh-99" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://aashutosh.dev"><img src="https://avatars2.githubusercontent.com/u/21199234?v=4?s=100" width="100px;" alt="Aashutosh Rathi"/><br /><sub><b>Aashutosh Rathi</b></sub></a><br /><a href="https://github.com/saadpasta/developerFolio/commits?author=aashutoshrathi" title="Code">💻</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://abhishekashyap.studio/"><img src="https://avatars3.githubusercontent.com/u/29458374?v=4?s=100" width="100px;" alt="Abhishek Kashyap"/><br /><sub><b>Abhishek Kashyap</b></sub></a><br /><a href="https://github.com/saadpasta/developerFolio/issues?q=author%3Aabhishekashyap" title="Bug reports">🐛</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/lcsvcn"><img src="https://avatars1.githubusercontent.com/u/6011385?v=4?s=100" width="100px;" alt="Lucas V C Nicolau"/><br /><sub><b>Lucas V C Nicolau</b></sub></a><br /><a href="https://github.com/saadpasta/developerFolio/commits?author=lcsvcn" title="Documentation">📖</a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://bradleycherrin.com"><img src="https://avatars0.githubusercontent.com/u/5648785?v=4?s=100" width="100px;" alt="Bradley C. Herrin"/><br /><sub><b>Bradley C. Herrin</b></sub></a><br /><a href="https://github.com/saadpasta/developerFolio/commits?author=bradleycherrin" title="Documentation">📖</a> <a href="#ideas-bradleycherrin" title="Ideas, Planning, & Feedback">🤔</a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://www.zekinahlecaros.com"><img src="https://avatars0.githubusercontent.com/u/43392346?v=4?s=100" width="100px;" alt="Zekinah Lecaros"/><br /><sub><b>Zekinah Lecaros</b></sub></a><br /><a href="https://github.com/saadpasta/developerFolio/commits?author=zekinah" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/vandana1499"><img src="https://avatars2.githubusercontent.com/u/29394600?v=4?s=100" width="100px;" alt="unbeat"/><br /><sub><b>unbeat</b></sub></a><br /><a href="https://github.com/saadpasta/developerFolio/commits?author=vandana1499" title="Documentation">📖</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/lARSHADl"><img src="https://avatars3.githubusercontent.com/u/45604332?v=4?s=100" width="100px;" alt="Arshad Ahmed"/><br /><sub><b>Arshad Ahmed</b></sub></a><br /><a href="https://github.com/saadpasta/developerFolio/commits?author=lARSHADl" title="Documentation">📖</a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://xiaohuiliu.me"><img src="https://avatars1.githubusercontent.com/u/33507446?v=4?s=100" width="100px;" alt="Xiaohui Liu"/><br /><sub><b>Xiaohui Liu</b></sub></a><br /><a href="https://github.com/saadpasta/developerFolio/commits?author=Ergouzii" title="Documentation">📖</a> <a href="https://github.com/saadpasta/developerFolio/commits?author=Ergouzii" title="Code">💻</a> <a href="#design-Ergouzii" title="Design">🎨</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://seungyeon-lee.github.io/"><img src="https://avatars1.githubusercontent.com/u/26589915?v=4?s=100" width="100px;" alt="Seungyeon-Lee"/><br /><sub><b>Seungyeon-Lee</b></sub></a><br /><a href="https://github.com/saadpasta/developerFolio/commits?author=Seungyeon-Lee" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/NajamShehzad"><img src="https://avatars2.githubusercontent.com/u/37629243?v=4?s=100" width="100px;" alt="Najam Shehzad "/><br /><sub><b>Najam Shehzad </b></sub></a><br /><a href="https://github.com/saadpasta/developerFolio/commits?author=NajamShehzad" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://www.exspiravit.ga/"><img src="https://avatars1.githubusercontent.com/u/22334680?v=4?s=100" width="100px;" alt="Randy Jesus Real Srsen"/><br /><sub><b>Randy Jesus Real Srsen</b></sub></a><br /><a href="https://github.com/saadpasta/developerFolio/commits?author=Exspiravit" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://tamojitdas.netlify.app"><img src="https://avatars0.githubusercontent.com/u/40804626?v=4?s=100" width="100px;" alt="Tamojit Das"/><br /><sub><b>Tamojit Das</b></sub></a><br /><a href="https://github.com/saadpasta/developerFolio/commits?author=tamojit-123" title="Documentation">📖</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://warengonzaga.com"><img src="https://avatars1.githubusercontent.com/u/15052701?v=4?s=100" width="100px;" alt="Waren Gonzaga"/><br /><sub><b>Waren Gonzaga</b></sub></a><br /><a href="https://github.com/saadpasta/developerFolio/commits?author=WarenGonzaga" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://www.benjaminbourgeois.com"><img src="https://avatars3.githubusercontent.com/u/20949060?v=4?s=100" width="100px;" alt="Benjamin Bourgeois"/><br /><sub><b>Benjamin Bourgeois</b></sub></a><br /><a href="https://github.com/saadpasta/developerFolio/commits?author=BourgeoisBenjamin" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://www.linkedin.com/in/keshavjain235"><img src="https://avatars2.githubusercontent.com/u/52530690?v=4?s=100" width="100px;" alt="Keshav Jain"/><br /><sub><b>Keshav Jain</b></sub></a><br /><a href="https://github.com/saadpasta/developerFolio/commits?author=keshavjain235" title="Code">💻</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://hanzla.ga"><img src="https://avatars.githubusercontent.com/u/59178380?v=4?s=100" width="100px;" alt="Hanzla"/><br /><sub><b>Hanzla</b></sub></a><br /><a href="https://github.com/saadpasta/developerFolio/commits?author=1hanzla100" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/yogeshhrathod"><img src="https://avatars.githubusercontent.com/u/46518134?v=4?s=100" width="100px;" alt="Yogesh Rathod"/><br /><sub><b>Yogesh Rathod</b></sub></a><br /><a href="https://github.com/saadpasta/developerFolio/commits?author=yogeshhrathod" title="Documentation">📖</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/AlKun25"><img src="https://avatars.githubusercontent.com/u/53429438?v=4?s=100" width="100px;" alt="Kunal Mundada"/><br /><sub><b>Kunal Mundada</b></sub></a><br /><a href="https://github.com/saadpasta/developerFolio/commits?author=AlKun25" title="Documentation">📖</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/jayhawk24"><img src="https://avatars.githubusercontent.com/u/38766415?v=4?s=100" width="100px;" alt="Anubhav Gupta"/><br /><sub><b>Anubhav Gupta</b></sub></a><br /><a href="https://github.com/saadpasta/developerFolio/commits?author=jayhawk24" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://vatsaldavevdwpblog.wordpress.com/"><img src="https://avatars.githubusercontent.com/u/42956495?v=4?s=100" width="100px;" alt="Vatsal Dave"/><br /><sub><b>Vatsal Dave</b></sub></a><br /><a href="https://github.com/saadpasta/developerFolio/commits?author=vatsaldaveVD" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://www.elvisciuffetelli.com"><img src="https://avatars.githubusercontent.com/u/35818757?v=4?s=100" width="100px;" alt="Elvis Ciuffetelli"/><br /><sub><b>Elvis Ciuffetelli</b></sub></a><br /><a href="https://github.com/saadpasta/developerFolio/commits?author=elvisciuffetelli" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://ScottJellen.com"><img src="https://avatars.githubusercontent.com/u/51421669?v=4?s=100" width="100px;" alt="Scott Jellen"/><br /><sub><b>Scott Jellen</b></sub></a><br /><a href="https://github.com/saadpasta/developerFolio/commits?author=SJellen" title="Code">💻</a> <a href="#design-SJellen" title="Design">🎨</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://www.linkedin.com/in/karthik-mohan-/"><img src="https://avatars.githubusercontent.com/u/25052382?v=4?s=100" width="100px;" alt="Karthik Mohan"/><br /><sub><b>Karthik Mohan</b></sub></a><br /><a href="https://github.com/saadpasta/developerFolio/issues?q=author%3Akarthikmohan" title="Bug reports">🐛</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/mhowell11"><img src="https://avatars.githubusercontent.com/u/62813469?v=4?s=100" width="100px;" alt="mhowell11"/><br /><sub><b>mhowell11</b></sub></a><br /><a href="https://github.com/saadpasta/developerFolio/commits?author=mhowell11" title="Documentation">📖</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/gajanandh"><img src="https://avatars.githubusercontent.com/u/80502737?v=4?s=100" width="100px;" alt="gajanandh"/><br /><sub><b>gajanandh</b></sub></a><br /><a href="https://github.com/saadpasta/developerFolio/issues?q=author%3Agajanandh" title="Bug reports">🐛</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/JooHyukKim"><img src="https://avatars.githubusercontent.com/u/61615301?v=4?s=100" width="100px;" alt="JooHyukKim"/><br /><sub><b>JooHyukKim</b></sub></a><br /><a href="https://github.com/saadpasta/developerFolio/commits?author=JooHyukKim" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://redheadphone.github.io/"><img src="https://avatars.githubusercontent.com/u/55500003?v=4?s=100" width="100px;" alt="Red Headphone"/><br /><sub><b>Red Headphone</b></sub></a><br /><a href="https://github.com/saadpasta/developerFolio/commits?author=RedHeadphone" title="Code">💻</a> <a href="https://github.com/saadpasta/developerFolio/issues?q=author%3ARedHeadphone" title="Bug reports">🐛</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://sunitroy2703.github.io"><img src="https://avatars.githubusercontent.com/u/67560900?v=4?s=100" width="100px;" alt="Sunit Roy"/><br /><sub><b>Sunit Roy</b></sub></a><br /><a href="https://github.com/saadpasta/developerFolio/issues?q=author%3ASunitRoy2703" title="Bug reports">🐛</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/nayabatir1"><img src="https://avatars.githubusercontent.com/u/91016903?v=4?s=100" width="100px;" alt="Atir Nayab"/><br /><sub><b>Atir Nayab</b></sub></a><br /><a href="https://github.com/saadpasta/developerFolio/issues?q=author%3Anayabatir1" title="Bug reports">🐛</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="http://thatdevsherry.pk"><img src="https://avatars.githubusercontent.com/u/40890226?v=4?s=100" width="100px;" alt="Shehriyar Qureshi"/><br /><sub><b>Shehriyar Qureshi</b></sub></a><br /><a href="https://github.com/saadpasta/developerFolio/commits?author=thatdevsherry" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/Rispectech"><img src="https://avatars.githubusercontent.com/u/90450963?v=4?s=100" width="100px;" alt="respectech"/><br /><sub><b>respectech</b></sub></a><br /><a href="https://github.com/saadpasta/developerFolio/commits?author=Rispectech" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://braydentw.com"><img src="https://avatars.githubusercontent.com/u/47185402?v=4?s=100" width="100px;" alt="Brayden"/><br /><sub><b>Brayden</b></sub></a><br /><a href="https://github.com/saadpasta/developerFolio/issues?q=author%3ABraydenTW" title="Bug reports">🐛</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/CanciuCostin"><img src="https://avatars.githubusercontent.com/u/27332434?v=4?s=100" width="100px;" alt="Canciu Costin"/><br /><sub><b>Canciu Costin</b></sub></a><br /><a href="https://github.com/saadpasta/developerFolio/commits?author=CanciuCostin" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/SpectralGT"><img src="https://avatars.githubusercontent.com/u/78777556?v=4?s=100" width="100px;" alt="Atharv Singh"/><br /><sub><b>Atharv Singh</b></sub></a><br /><a href="https://github.com/saadpasta/developerFolio/commits?author=SpectralGT" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://allishaan.co"><img src="https://avatars.githubusercontent.com/u/59707330?v=4?s=100" width="100px;" alt="Ishan Khandelwal"/><br /><sub><b>Ishan Khandelwal</b></sub></a><br /><a href="https://github.com/saadpasta/developerFolio/commits?author=Ishan-001" title="Documentation">📖</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://slyapustin.com"><img src="https://avatars.githubusercontent.com/u/370774?v=4?s=100" width="100px;" alt="Sergey Lyapustin"/><br /><sub><b>Sergey Lyapustin</b></sub></a><br /><a href="https://github.com/saadpasta/developerFolio/commits?author=slyapustin" title="Code">💻</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://www.cam1pozas.xyz/"><img src="https://avatars.githubusercontent.com/u/89259499?v=4?s=100" width="100px;" alt="Camila Pozas"/><br /><sub><b>Camila Pozas</b></sub></a><br /><a href="https://github.com/saadpasta/developerFolio/commits?author=camipozas" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://saiteja13427.github.io"><img src="https://avatars.githubusercontent.com/u/40917760?v=4?s=100" width="100px;" alt="Sai Teja"/><br /><sub><b>Sai Teja</b></sub></a><br /><a href="https://github.com/saadpasta/developerFolio/issues?q=author%3Asaiteja13427" title="Bug reports">🐛</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/Vinitvh"><img src="https://avatars.githubusercontent.com/u/42197888?v=4?s=100" width="100px;" alt="Vinit Hemadri "/><br /><sub><b>Vinit Hemadri </b></sub></a><br /><a href="https://github.com/saadpasta/developerFolio/commits?author=Vinitvh" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/Njong392"><img src="https://avatars.githubusercontent.com/u/81039882?v=4?s=100" width="100px;" alt="Njong Emy"/><br /><sub><b>Njong Emy</b></sub></a><br /><a href="https://github.com/saadpasta/developerFolio/commits?author=Njong392" title="Documentation">📖</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://tamal.vercel.app/"><img src="https://avatars.githubusercontent.com/u/72851613?v=4?s=100" width="100px;" alt="Tamal Das "/><br /><sub><b>Tamal Das </b></sub></a><br /><a href="https://github.com/saadpasta/developerFolio/commits?author=IAmTamal" title="Documentation">📖</a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://dunsin.vercel.app"><img src="https://avatars.githubusercontent.com/u/78784850?v=4?s=100" width="100px;" alt="Dunsin"/><br /><sub><b>Dunsin</b></sub></a><br /><a href="https://github.com/saadpasta/developerFolio/commits?author=Dun-sin" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/muneebahmedayub"><img src="https://avatars.githubusercontent.com/u/65030135?v=4?s=100" width="100px;" alt="Muneeb Ahmed"/><br /><sub><b>Muneeb Ahmed</b></sub></a><br /><a href="https://github.com/saadpasta/developerFolio/commits?author=muneebahmedayub" title="Code">💻</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://www.linkedin.com/in/qais-attarwala/"><img src="https://avatars.githubusercontent.com/u/52388168?v=4?s=100" width="100px;" alt="Qais Attarwala"/><br /><sub><b>Qais Attarwala</b></sub></a><br /><a href="https://github.com/saadpasta/developerFolio/commits?author=KazAttarwala" title="Code">💻</a></td>
    </tr>
  </tbody>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

## JH.LOG 관리자 운영 가이드

공개 사이트는 GitHub Pages의 정적 사이트로 유지되고, `/admin/`은 설정된 HTTPS
`*.workers.dev` 관리자 주소로만 연결됩니다. 글 원본은 계속 `posts/*.md`와 Git
기록에 남습니다.

- 관리자 주소: `https://jh-log-admin.2jeonghoon.workers.dev`
- GitHub App: 비공개 `JH.LOG Admin`, `2jeonghoon/2jeonghoon.github.io`에만 설치
- 권한: Metadata 읽기(필수), Contents 읽기/쓰기만 허용
- Webhook과 device flow는 사용하지 않음

### 일상적인 글 관리

1. 공개 블로그의 `Write` 또는 관리자 주소를 열고 GitHub 소유자 계정으로
   로그인합니다.
2. 새 글은 먼저 `초안 저장`으로 보관합니다. 초안은 공개 글 목록, RSS,
   사이트맵에 포함되지 않습니다.
3. 공개할 때 필수 메타데이터를 채우고 `발행`을 누릅니다. Agent가 제공된 정보를
   기반으로 작성한 글에만 `Agent 작성 글`을 선택합니다.
4. 기존 글은 목록에서 선택해 수정합니다. 다른 탭이나 GitHub에서 먼저 변경되어
   충돌 메시지가 나오면 새로고침 후 최신 내용을 기준으로 다시 편집합니다.
5. 삭제할 때는 확인란에 표시된 슬러그를 정확히 다시 입력합니다. 삭제도 Git
   커밋이므로 복구할 수 있습니다.

저장 후 GitHub Actions의 `Deploy blog to Pages`가 성공해야 공개 사이트에
반영됩니다. 실패하면 Actions 로그에서 테스트 또는 빌드 오류를 먼저 확인하고,
글의 front matter와 이미지 경로를 로컬 `npm run test:blog`로 재현합니다.

### 삭제한 글 복구

삭제 전 기록을 찾고 해당 커밋의 부모에서 파일을 복구한 다음 커밋·푸시합니다.

```bash
git log --all -- posts/<slug>.md
git restore --source=<delete-commit>^ -- posts/<slug>.md
git add posts/<slug>.md
git commit -m "blog: restore <slug>"
git push origin main
```

### 배포 및 인증 문제 점검

- Worker 공개 화면은 열리지만 로그인되지 않으면 GitHub App callback URL이
  `https://jh-log-admin.2jeonghoon.workers.dev/auth/callback`과 정확히 같은지 확인합니다.
- 로그인 후 글 목록이 실패하면 App이 대상 저장소에만 설치됐는지, Contents 권한이
  읽기/쓰기인지, 설치 ID와 Worker 비밀 바인딩 이름이 맞는지 확인합니다.
- GitHub에서 내려받은 App 키는 PKCS#1 형식일 수 있습니다. Worker Web Crypto용
  PKCS#8로 임시 변환해 `GITHUB_APP_PRIVATE_KEY`로 올린 뒤 임시 사본을 즉시
  삭제합니다. 원본 `.pem`도 저장소 밖에만 둡니다.
- `npx wrangler tail --config worker/wrangler.toml`로 요청 ID에 대응하는 런타임
  오류를 확인합니다. 비밀값이나 OAuth code를 로그에 출력하지 않습니다.
- 설정 변경 후 `npm run deploy:admin`을 실행하고 `/api/session`, 로그아웃 상태의
  `/api/posts`, 잘못된 OAuth state가 각각 정상 응답, `401`, `403`인지 확인합니다.

### 자격 증명과 접근 권한 관리

Cloudflare에는 `GITHUB_APP_ID`, `GITHUB_APP_CLIENT_ID`,
`GITHUB_APP_CLIENT_SECRET`, `GITHUB_APP_PRIVATE_KEY`,
`SESSION_SIGNING_KEY`를 `wrangler secret put`으로 저장합니다. 값은 코드,
`wrangler.toml`, 브라우저 저장소에 넣지 않습니다.

- App 개인 키: GitHub에서 새 키를 만든 뒤 PKCS#8로 변환해 Worker 비밀값을 먼저
  교체하고 로그인/목록 조회를 확인한 후 이전 GitHub 키를 삭제합니다.
- Client secret: 새 secret을 Worker에 먼저 반영하고 로그인 확인 후 이전 secret을
  폐기합니다.
- Session key: 32바이트 이상의 새 난수로 교체합니다. 기존 관리자 세션은 모두
  즉시 로그아웃됩니다.
- 긴급 차단: GitHub App 설치를 제거하면 저장소 접근이 즉시 중단됩니다. 필요하면
  App의 모든 키와 client secret도 폐기합니다.

### 남용 방지와 사용량 모니터링

인증, 읽기, 변경 요청 제한은 `worker/wrangler.toml`의 `[[ratelimits]]`에서
조정합니다. 값을 바꾼 뒤 Worker를 재배포하고 `429` 동작을 확인합니다. 변경 API는
소유자 세션, 정확한 Origin, CSRF 토큰, JSON 형식, 본문 크기, 슬러그, 최신 Git SHA를
모두 검사하며 `posts/<slug>.md` 밖의 경로를 만들 수 없습니다.

Cloudflare의 Rate Limiting API는 위치별·eventually consistent 방식이라 짧은 burst가
설정 수치를 일시적으로 넘을 수 있습니다. 따라서 정확한 사용량 계산이나 인증을
대신하는 장치가 아니라 보조 방어선으로 취급하고, 실제 접근 제어는 위의 세션과
요청 검증에 의존합니다.

Cloudflare 대시보드에서 Worker 요청 수, 오류율, CPU 시간과 무료 사용량을
정기적으로 확인합니다. GitHub에서는 App 설치 범위와 Actions 실패 알림을
확인합니다. 예상치 못한 증가가 있으면 먼저 App 설치를 해제하고 Worker를
일시 중지한 뒤 로그의 요청 ID와 rate-limit 상태를 조사합니다.

---
