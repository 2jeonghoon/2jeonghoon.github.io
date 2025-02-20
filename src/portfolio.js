/* Change this file to get your personal Portfolio */

// To change portfolio colors globally go to the  _globalColor.scss file

import emoji from "react-easy-emoji";
import splashAnimation from "./assets/lottie/splashAnimation"; // Rename to your file name for custom animation

// Splash Screen

const splashScreen = {
  enabled: true, // set false to disable splash screen
  animation: splashAnimation,
  duration: 2000 // Set animation duration as per your animation
};

// Summary And Greeting Section

const illustration = {
  animated: true // Set to false to use static SVG
};

const greeting = {
  username: "2jeonghoon",
  title: "Hi all, I'm 2jeonghoon",
  subTitle: emoji(
    "A passionate Game Developer 🎮 specializing in game engine development, game server architecture, and performance optimization. Experienced in Unreal Engine, Unity, C++, and high-performance computing."
  ),
  resumeLink:
    "", // Set to empty to hide the button
  displayGreeting: true // Set false to hide this section, defaults to true
};

// Social Media Links

const socialMediaLinks = {
  github: "https://github.com/2jeonghoon",
//  linkedin: "https://www.linkedin.com/in/saadpasta/",
  gmail: "lee.jonghoon26@gmail.com",
//  gitlab: "https://gitlab.com/saadpasta",
//  facebook: "https://www.facebook.com/saad.pasta7",
//  medium: "https://medium.com/@saadpasta",
//  stackoverflow: "https://stackoverflow.com/users/10422806/saad-pasta",
  // Instagram, Twitter and Kaggle are also supported in the links!
  // To customize icons and social links, tweak src/components/SocialMedia
  display: true // Set true to display this section, defaults to false
};

// Skills Section

const skillsSection = {
  title: "What I do",
  subTitle: "PASSIONATE GAME DEVELOPER SPECIALIZAING IN GAME ENGINE, SERVER ARCHITECTURE, AND PERFORMANCE OPTIMIZATION",
  skills: [
    emoji(
      " 🎮 Develop high-performance game engines and interactive gameplay systems"
    ),
    emoji("⚡ Optimize game servers for multiplayer networking and low-latency performance"),
    emoji("🖥️ Build and integrate real-time physics, AI, and rendering pipelines"),
    emoji("⚡ Improve system performance through Linux Kernel and multithreading optimization"),
    emoji("🔧 Work with backend technologies to create scalable and efficient game architectures")
  ],

  /* Make Sure to include correct Font Awesome Classname to view your icon
https://fontawesome.com/icons?d=gallery */

  softwareSkills: [
    {
      skillName: "C++",
      fontAwesomeClassname: "fab fa-code"
    },
    {
      skillName: "C#",
      fontAwesomeClassname: "fab fa-hashtag"
    },
    {
      skillName: "Unreal Engine",
      fontAwesomeClassname: "fab fa-gamepad"
    },
    {
      skillName: "Unity",
      fontAwesomeClassname: "fab fa-unity"
    },
    {
      skillName: "Game Server",
      fontAwesomeClassname: "fab fa-server"
    },
    {
      skillName: "Linux Kernel",
      fontAwesomeClassname: "fab fa-linux"
    },
    {
      skillName: "Multithreading",
      fontAwesomeClassname: "fab fa-tasks"
    },
    {
      skillName: "Networking",
      fontAwesomeClassname: "fab fa-network-wired"
    },
    {
      skillName: "MySQL",
      fontAwesomeClassname: "fas fa-database"
    },
    {
      skillName: "AWS",
      fontAwesomeClassname: "fab fa-aws"
    },
    {
      skillName: "python",
      fontAwesomeClassname: "fab fa-python"
    },
  ],
  display: true // Set false to hide this section, defaults to true
};

// Education Section

const educationInfo = {
  display: true, // Set false to hide this section, defaults to true
  schools: [
    {
      schoolName: "Sangmyung University",
      logo: require("./assets/images/sangmyungLogo.jpg"),
      subHeader: "Bachelor and Master of Game Development and Design",
      duration: "March 2019 - Feburary 2026",
      desc: "Published 2 papers.",
      descBullets: [
        "A Study on Parallel Programming Approach for MMO Game Server, 2023"
      ]
    },
    {
      schoolName: "Sangmyung University",
      logo: require("./assets/images/sangmyungLogo.jpg"),
      subHeader: "Bachelor of Science in Computer Science",
      duration: "March 2023 - Feburary 2025",
      desc: "Published 1 papers.",
      descBullets: [
	      "Optimal Power Allocation and Sub-optimal Channel Assignment for Downlink NOMA System Using DRL, 2025"
      ]
    }
  ]
};

// Your top 3 proficient stacks/tech experience

const techStack = {
  viewSkillBars: true, //Set it to true to show Proficiency Section
  experience: [
    {
      Stack: "Unity", //Insert stack or technology you have experience in
      progressPercentage: "90%" //Insert relative proficiency in percentage
    },
    {
      Stack: "Unreal",
      progressPercentage: "90%"
    },
    {
      Stack: "Programming",
      progressPercentage: "60%"
    }
  ],
  displayCodersrank: false // Set true to display codersrank badges section need to changes your username in src/containers/skillProgress/skillProgress.js:17:62, defaults to false
};

// Work experience section

const workExperiences = {
  display: true, //Set it to true to show workExperiences Section
  experience: [
    {
      role: "Undergraduate Researcher",
      company: "ISSLAB",
      companylogo: require("./assets/images/isslabLogo.png"),
      date: "July 2022 – August 2024",
      desc: "Conducted research on optimizing Massively Multiplayer Online Role-Playing Game (MMORPG) servers to handle high concurrent user loads efficiently. Focoused on multi-threaded server design and process synchronization techniques to minimize latency and enhance user experience.",
      descBullets: [
	      "Developed a multi-threaded game server design to ensure stable response times under high concurrent user loads",
	      "Designed a task system to handle user state changes dynamically",
	      "Applied bot lock-based and lock-free algorithms to mitigate contention issues in process synchronization",
	      "Published research on game server performance optimization: [DBpia](https://www.dbpia.co.kr/Journal/articleDetail?nodeId=NODE11738020)",
	      "Optimized server performance using **io_uring**, significantly reducing I/O overhead and improving efficiency"
      ]
    },
    {
      role: "Graduate Researcher",
      company: "ISSLAB",
      companylogo: require("./assets/images/isslabLogo.png"),
      date: "September 2024 – Febuaray 2026",
      desc: "Conducted advanced research on optimizing the Linux kernel's io_uring mechanism to enhance I/O efficiency. Focused on modifying the submission queue entry buffer to support adaptive sizing rather than a fixed size, allowing dynamic resource allocation based on workload demands. This approach significantly improved I/O scalability and reduced memory overhead in high-performance systems."
    }
  ]
};

/* Your Open Source Section to View Your Github Pinned Projects
To know how to get github key look at readme.md */

const openSource = {
  showGithubProfile: "true", // Set true or false to show Contact profile using Github, defaults to true
  display: true // Set false to hide this section, defaults to true
};

// Some big projects you have worked on

const bigProjects = {
  title: "Projects",
  subtitle: "GAME DEVELOPMENT",
  projects: [
    {
      image: require("./assets/images/arkadiaLogo.png"),
      projectName: "Arkadia",
      genre: "Turn-based stratgy RPG"
      projectDesc: "A turn-based stratgy RPG with deep tactical gameplay, character progression, and immersive storytelling.",
      role: "Developed the inventory system, game's UI, asynchronous loading system, translation features, and settings management.",
      footerLink: [
        {
          name: "Watch Gameplay",
          url: "https://youtu.be/Rt0eyI-Z2Wc?si=YJYinejTZI6-MRRm"
        },
        {
	  name: "Visit Website",
	  url: "https://store.steampowered.com/app/3122380/Arkadia/"
	}
      ],
     challenges: [
	     "Due to time constraints, the project was not completed as initially envisioned, with only about 25% of the planned content fully developed.",
             "Frequent bugs in the core gameplay mechanics led to negative feedback from early players.",
             "Although I was not responsible for the core gameplay development, I was involved in the finalization process, which was rushed due to limited time.",
             "It was disappointing not to see the project fully realized, but it was a valuable learning experience in game development and project management."
     ],
    },
    {
      image: require("./assets/images/necroechoLogo.webp"),
      projectName: "Necro Echo",
      genre: "3D Puzzle Adventure"
      role: "main game developer"
      footerLink: [
        {
          name: "",
          url: ""
        }
      ]
    }
  ],
  display: true // Set false to hide this section, defaults to true
};

// Achievement Section
// Include certificates, talks etc

const achievementSection = {
  title: emoji("Achievements And Certifications 🏆 "),
  subtitle:
    "Achievements, Certifications, Award Letters and Some Cool Stuff that I have done !",

  achievementsCards: [
    {
      title: "Google Code-In Finalist",
      subtitle:
        "First Pakistani to be selected as Google Code-in Finalist from 4000 students from 77 different countries.",
      image: require("./assets/images/codeInLogo.webp"),
      imageAlt: "Google Code-In Logo",
      footerLink: [
        {
          name: "Certification",
          url: "https://drive.google.com/file/d/0B7kazrtMwm5dYkVvNjdNWjNybWJrbndFSHpNY2NFV1p4YmU0/view?usp=sharing"
        },
        {
          name: "Award Letter",
          url: "https://drive.google.com/file/d/0B7kazrtMwm5dekxBTW5hQkg2WXUyR3QzQmR0VERiLXlGRVdF/view?usp=sharing"
        },
        {
          name: "Google Code-in Blog",
          url: "https://opensource.googleblog.com/2019/01/google-code-in-2018-winners.html"
        }
      ]
    },
    {
      title: "Google Assistant Action",
      subtitle:
        "Developed a Google Assistant Action JavaScript Guru that is available on 2 Billion devices world wide.",
      image: require("./assets/images/googleAssistantLogo.webp"),
      imageAlt: "Google Assistant Action Logo",
      footerLink: [
        {
          name: "View Google Assistant Action",
          url: "https://assistant.google.com/services/a/uid/000000100ee688ee?hl=en"
        }
      ]
    },

    {
      title: "PWA Web App Developer",
      subtitle: "Completed Certifcation from SMIT for PWA Web App Development",
      image: require("./assets/images/pwaLogo.webp"),
      imageAlt: "PWA Logo",
      footerLink: [
        {name: "Certification", url: ""},
        {
          name: "Final Project",
          url: "https://pakistan-olx-1.firebaseapp.com/"
        }
      ]
    }
  ],
  display: true // Set false to hide this section, defaults to true
};

// Blogs Section

const blogSection = {
  title: "Blogs",
  subtitle:
    "With Love for Developing cool stuff, I love to write and teach others what I have learnt.",
  displayMediumBlogs: "false", // Set true to display fetched medium blogs instead of hardcoded ones
  blogs: [
    {
      url: "https://blog.usejournal.com/create-a-google-assistant-action-and-win-a-google-t-shirt-and-cloud-credits-4a8d86d76eae",
      title: "Win a Google Assistant Tshirt and $200 in Google Cloud Credits",
      description:
        "Do you want to win $200 and Google Assistant Tshirt by creating a Google Assistant Action in less then 30 min?"
    },
    {
      url: "https://medium.com/@saadpasta/why-react-is-the-best-5a97563f423e",
      title: "Why REACT is The Best?",
      description:
        "React is a JavaScript library for building User Interface. It is maintained by Facebook and a community of individual developers and companies."
    }
  ],
  display: true // Set false to hide this section, defaults to true
};

// Talks Sections

const talkSection = {
  title: "TALKS",
  subtitle: emoji(
    "I LOVE TO SHARE MY LIMITED KNOWLEDGE AND GET A SPEAKER BADGE 😅"
  ),

  talks: [
    {
      title: "Build Actions For Google Assistant",
      subtitle: "Codelab at GDG DevFest Karachi 2019",
      slides_url: "https://bit.ly/saadpasta-slides",
      event_url: "https://www.facebook.com/events/2339906106275053/"
    }
  ],
  display: true // Set false to hide this section, defaults to true
};

// Podcast Section

const podcastSection = {
  title: emoji("Podcast 🎙️"),
  subtitle: "I LOVE TO TALK ABOUT MYSELF AND TECHNOLOGY",

  // Please Provide with Your Podcast embeded Link
  podcast: [
    "https://anchor.fm/codevcast/embed/episodes/DevStory---Saad-Pasta-from-Karachi--Pakistan-e9givv/a-a15itvo"
  ],
  display: true // Set false to hide this section, defaults to true
};

// Resume Section
const resumeSection = {
  title: "Resume",
  subtitle: "Feel free to download my resume",

  // Please Provide with Your Podcast embeded Link
  display: true // Set false to hide this section, defaults to true
};

const contactInfo = {
  title: emoji("Contact Me ☎️"),
  subtitle:
    "Discuss a project or just want to say hi? My Inbox is open for all.",
  number: "+92-0000000000",
  email_address: "saadpasta70@gmail.com"
};

// Twitter Section

const twitterDetails = {
  userName: "twitter", //Replace "twitter" with your twitter username without @
  display: true // Set true to display this section, defaults to false
};

const isHireable = false; // Set false if you are not looking for a job. Also isHireable will be display as Open for opportunities: Yes/No in the GitHub footer

export {
  illustration,
  greeting,
  socialMediaLinks,
  splashScreen,
  skillsSection,
  educationInfo,
  techStack,
  workExperiences,
  openSource,
  bigProjects,
  achievementSection,
  blogSection,
  talkSection,
  podcastSection,
  contactInfo,
  twitterDetails,
  isHireable,
  resumeSection
};
