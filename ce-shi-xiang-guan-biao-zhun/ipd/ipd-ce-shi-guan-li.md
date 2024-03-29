# IPD测试管理

![IPD中有两条线，一条是业务计划决策；一条是业务技术决策；](<../../.gitbook/assets/image (84).png>)

## IPD中的测试管理

IPD中的测试管理通过Incremental Build And Test模型进行，思想就是尽早测试，通过增量的方式构建整个系统；

![IBT关键测试活动](<../../.gitbook/assets/image (66).png>)

分为四个阶段：

* **BBVF(Building Block Functional Validation) \[ TR3 - TR4 ]**\
  ****构建模块功能确认BBFV( Building Block Functional Validation)：构建模块是指设计单元，例如一个单元电路，一个软件函数，一个结构零件等等。BBFV通常是以设计人员为主，测试人员参加。\

* **SDV(System Design Test) \[ TR4 - TR4A ]**\
  ****系统设计验证SDV(System Design Verification):子系统或模块级测试，包括基本功能、性能的常规测试、以及各种可靠性类测试，例如针对电子产品的容错/容限测试、EMC测试、安全测试、噪声测试、热测试、环境可靠性测试等等。若是机械结构类产品或部件，SDV应增加疲劳测试、结构强度测试、结构刚性测试等。SDV工作通常是以测试人员为主，设计人员参加。\

*   **SIT(System Intergration Test) \[ TR4A - TR5 ]**

    ****\
    ****系统集成测试SIT(System Integration Test)：产品整机测试，测试内容与SDV大致相同，但增加可用性测试、可维护性测试和包装测试。SIT在开发阶段后期，由测试人员负责完成。\

* **SVT(System Verification Test) \[ TR5-TR6 ]**\
  ****系统验证测试SVT(System Verification Test)：小批量试制情况下的测试，测试内容与SDV大致相同，但强调从试制生产线随机抽检，关注产品质量一致性，SVT必须在SIT完成之后在验证阶段完成．SVT工作以测试人员为主，试制人员参加即可。

![SDV、SIT和SVT阶段异同](<../../.gitbook/assets/image (37).png>)

## 对齐IPD测试活动

由于产品开发采用的IPD流程，因此测试活动也需要与IPD流程对齐；

一般先进行测试计划，在计划里面明确测试对象，什么时候启动测试，什么时候结束测试，进入和退出准则，投入什么资源，包含人力的、实验资源等等（这些资源后续还可进一步细化）；

测试计划首先对各个测试对象进行质量建模后，粗略进行风险分析(新开发的，还是完全继承或者修改继承， 失效出现的概率和影响多大，得到最终的风险估算因子)，进行资源分配，确定一个粗略的测试策略；

所谓测试策略，即对被测对象在哪个测试级别(Test Level)进行哪种测试类型(Test Type)的测试；

测试策略之所以涉及到测试级别，就是因为某些特性是比较独立的，可以在BBFV，SDV阶段完成；某些特性是需要相互配套的子系统一起完成，需要在SIT阶段做；某些需要依赖外部环境，需要在用户那里做，那么就需要在SVT阶段做；

到了具体的测试，就需要进行测试设计，所谓的测试设计，就是打算对这个质量特性分别在哪些测试级别(Test Level)应用那些测试模式(Test Type)进行测试；



#### 举例：OLT ONU TLS特性测试

1. 分析规格，梳理质量模型\

2. 分析质量模型中规格风险，参考资源需求、项目计划、人力投入等，确定最早在哪个IPD阶段启动测试\

3. 对该层级的测试活动进行测试设计

![](<../../.gitbook/assets/image (33) (2).png>)

## IPD的四个流程和软件测试V模型的四个流程的异同

IPD的四个流程和软件测试V模型是完全不同的东西，但是它们也有类似点，容易让人混淆；

IPD的四个流程更偏重于发货制造，主要关注什么时候可以确定BOM，什么时候可以小批量试制，大批量试制和批量发货；

软件测试V模型更关注于系统的集成过程(UT->SIT->ST)， 内部和外部测试(ST vs UAT)；

### BBVF vs UT

IPD中的BBVF，测试对象是设计单元，可以是一个软件或硬件模块，测试重点是各项设计是否OK；

软件测试中的UT单元测试，测试对象是函数或者模块，测试重点是验证模块的自身功能是否OK；

### SDV vs IT

IPD中的SDV，测试对象是子系统设计验证，所谓子系统是指软件子系统，硬件子系统等等，重点是子系统功能验证；

软件测试中的IT，测试对象是系统各个组件，测试重点是组件之间的交互是否正常，集成是否存在问题；

### SIT vs ST

IPD中的SIT，测试对象是整机(整个系统，软件硬件包装等等)，测试重点是整个产品集成后是否正常工作；

软件测试中的ST，指的是系统测试，测试重点是否满足用户需求；

### SVT vs  User Acceptance Testing

IPD中的SVT，测试对象还是整机，只不过是测试产线上面生产的设备；还会进行一些认证、准入测试；

软件测试中的UAT，测试对象还是整个系统，是在用户生产环境中测试，一般由用户进行；

