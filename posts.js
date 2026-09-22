window.BLOG_POSTS = [
  {
    "slug": "nazgul-adaptive-io-uring-sq",
    "title": "Nazgul: io_uring의 Submission Queue를 동적으로 관리하기",
    "description": "고정된 SQ depth가 만드는 병렬성과 캐시 효율의 딜레마를 풀기 위해, 부하에 따라 capacity를 확장하고 회수하는 커널 메커니즘을 설계한 기록입니다.",
    "date": "2026-09-21",
    "category": "Systems",
    "tags": [
      "Linux",
      "io_uring",
      "Kernel",
      "Performance"
    ],
    "readingTime": "8 min read",
    "image": "assets/nazgul-architecture.png",
    "featured": true,
    "draft": false,
    "aiGenerated": true,
    "content": "<p><code>io_uring</code>은 애플리케이션과 Linux 커널이 공유 메모리의 queue를 통해 I/O 요청과 완료를 교환하는 비동기 I/O 인터페이스다. 특히 SQPOLL 모드에서는 커널 스레드가 Submission Queue를 polling하므로 애플리케이션의 submission과 커널의 issuance가 병렬로 진행된다.</p>\n<h2>고정된 queue depth의 딜레마</h2>\n<p>Submission Queue의 크기는 생성 시점에 정해진다. 작은 queue는 cache locality에 유리하지만 순간적인 burst를 받아내지 못해 submission stall을 만든다. 반대로 큰 queue는 burst를 흡수하지만 평상시에도 더 큰 메모리 영역을 순회하며 cache pressure를 높인다.</p>\n<blockquote>\n<p>워크로드는 변하는데 queue의 크기만 고정되어 있다는 것이 문제의 출발점이었다.</p>\n</blockquote>\n<h2>Nazgul의 접근</h2>\n<p>Nazgul은 기존 <code>io_uring</code> 인터페이스를 변경하지 않고 SQPOLL의 유효 submission capacity를 동적으로 관리한다. SQ가 포화되면 block 단위로 capacity를 확장하고, 부하가 낮아지면 사용되지 않는 block을 회수한다.</p>\n<p><img src=\"assets/nazgul-architecture.png\" alt=\"Nazgul의 동적 Submission Queue 관리 구조\"></p>\n<h3>설계 원칙</h3>\n<ul>\n<li><strong>User-transparent:</strong> 기존 애플리케이션을 수정하지 않는다.</li>\n<li><strong>Burst responsive:</strong> queue 포화를 감지해 빠르게 여유 공간을 확보한다.</li>\n<li><strong>Cache conscious:</strong> 부하가 사라진 뒤에는 확장한 block을 회수한다.</li>\n</ul>\n<h2>투명한 remapping</h2>\n<p>애플리케이션이 보고 있는 submission path를 유지하면서 내부 block의 연결을 바꾸는 것이 핵심이다. 이 방식으로 API 호환성을 지키고 동적 capacity가 애플리케이션의 복잡도로 새어 나오지 않게 했다.</p>\n<h2>배운 점</h2>\n<p>성능 최적화는 가장 큰 숫자를 선택하는 일이 아니었다. 작은 queue와 큰 queue가 각각 잘하는 구간을 인정하고, 시스템이 현재 부하에 맞는 상태로 이동하게 만드는 일이 더 중요했다. Nazgul은 그 관찰을 Linux I/O 경로에 적용한 결과다.</p>\n"
  },
  {
    "slug": "parallel-mmorpg-server",
    "title": "MMORPG 서버의 병렬 처리 구조를 설계하며 배운 것",
    "description": "많은 사용자의 상태 변경을 안정적으로 처리하기 위해 태스크 시스템과 lock-based, lock-free 동기화 방식을 비교하고 적용한 과정입니다.",
    "date": "2024-08-31",
    "category": "Game Server",
    "tags": [
      "C",
      "Multithreading",
      "Networking",
      "MMORPG"
    ],
    "readingTime": "6 min read",
    "image": "assets/mmorpg-server-architecture.png",
    "featured": false,
    "draft": false,
    "aiGenerated": true,
    "content": "<p>MMORPG 서버는 수많은 사용자의 입력과 월드 상태 변경을 동시에 처리해야 한다. 처리량을 높이기 위해 스레드를 늘리는 것만으로는 충분하지 않았다. 공유 상태에 대한 경쟁이 커질수록 응답 시간은 오히려 불안정해졌다.</p>\n<h2>작업을 태스크로 분리하기</h2>\n<p>네트워크 이벤트를 받은 스레드가 게임 로직 전체를 수행하지 않도록 작업을 작은 태스크로 분리했다. 태스크는 실행에 필요한 상태와 연산을 캡슐화하고 worker가 처리한다. 덕분에 I/O 처리와 게임 상태 변경의 책임을 분리할 수 있었다.</p>\n<p><img src=\"assets/mmorpg-server-architecture.png\" alt=\"MMORPG 서버의 소켓, 동기화, 태스크 시스템 구조\"></p>\n<h2>Lock은 없애는 것보다 범위를 아는 것이 먼저다</h2>\n<p>lock-free 자료구조가 언제나 더 빠른 것은 아니다. 충돌 빈도, 임계 영역의 크기, 재시도 비용을 함께 보아야 한다. 비교 과정에서는 다음 항목을 중심으로 측정했다.</p>\n<ul>\n<li>동시 접속자 증가에 따른 평균·꼬리 응답 시간</li>\n<li>공유 객체별 contention 빈도</li>\n<li>재시도와 context switching에 소비되는 CPU 시간</li>\n</ul>\n<h2>결론</h2>\n<p>좋은 병렬 구조는 스레드의 수보다 소유권이 분명했다. 어느 worker가 어떤 상태를 바꿀 수 있는지 제한하고, 공유가 필요한 지점을 작게 유지하자 처리량뿐 아니라 디버깅 가능성도 좋아졌다.</p>\n<p>관련 연구는 <a href=\"https://db.koreascholar.com/Article/Detail/427710\">A Study on Parallel Programming Approach for MMO Game Server</a>에서 확인할 수 있다.</p>\n"
  },
  {
    "slug": "arkadia-development-retrospective",
    "title": "Arkadia 개발 회고: 완성도를 만드는 것은 무엇이었나",
    "description": "턴제 전략 RPG를 졸업 작품으로 만들고 PlayX4에서 시연하기까지, UI와 비동기 로딩을 담당하며 얻은 현실적인 교훈을 정리했습니다.",
    "date": "2024-05-26",
    "category": "Game Dev",
    "tags": [
      "Unreal Engine",
      "C++",
      "UI/UX",
      "Postmortem"
    ],
    "readingTime": "5 min read",
    "image": "assets/arkadia-logo.jpg",
    "featured": false,
    "draft": false,
    "aiGenerated": true,
    "content": "<p>Arkadia는 게임전공 졸업 프로젝트로 제작한 턴제 전략 RPG다. 인벤토리, 게임 내 UI, 비동기 로딩, 번역, 설정 관리 기능을 담당했고 PlayX4에서 관람객에게 직접 시연했다.</p>\n<h2>기능의 수와 완성도는 다르다</h2>\n<p>초기 기획은 컸고 개발 시간은 제한적이었다. 기능을 추가하는 속도에 집중하는 동안 핵심 플레이의 버그와 콘텐츠 완성도가 충분히 따라오지 못했다. 결과적으로 계획했던 콘텐츠의 일부만 온전히 완성할 수 있었다.</p>\n<h2>UI도 게임 시스템이다</h2>\n<p>인벤토리와 설정 화면은 단순한 표시 계층이 아니었다. 데이터의 수명 주기, 저장 시점, 비동기 로딩 상태를 모두 이해해야 안정적인 UI가 나왔다. 표시 로직과 게임 상태를 분리하고, 로딩 중·실패·빈 상태를 명시적으로 다루는 것이 중요했다.</p>\n<h2>실제 플레이어가 알려준 것</h2>\n<p>PlayX4 시연에서는 개발자가 익숙해서 지나쳤던 문제가 곧바로 드러났다. 설명 없이도 다음 행동을 이해할 수 있는지, 피드백이 충분히 빠른지, 실패 원인을 알 수 있는지가 기능의 존재보다 중요했다.</p>\n<blockquote>\n<p>완성도는 더 많은 기능이 아니라, 플레이어가 막히는 순간을 하나씩 제거하는 과정에 가까웠다.</p>\n</blockquote>\n<h2>다음 프로젝트에 가져갈 원칙</h2>\n<ul>\n<li>핵심 플레이 루프를 먼저 완성하고 범위를 확장한다.</li>\n<li>외부 테스트를 개발 후반 이벤트가 아니라 반복 과정으로 만든다.</li>\n<li>비동기 상태와 실패 상태를 처음부터 UI 설계에 포함한다.</li>\n</ul>\n<p><a href=\"https://store.steampowered.com/app/3122380/Arkadia/\">Steam에서 Arkadia 보기</a></p>\n"
  }
];
