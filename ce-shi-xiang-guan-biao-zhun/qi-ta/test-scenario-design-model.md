---
description: 测试场景设计模型
---

# Test Scenario Design Model

为什么要发明测试场景设计模型？

传统的测试不是以用户为中心；以往的测试设计方法，越来越不能满足当前敏捷开发的需要；

测试场景设计模型如何使用？

传统的以用户为中心的场景测试用例最大的毛病在于要等待系统开发完毕之后才能测试；

为了解决这个问题，首先从一个真实的用户Story作为切入点，把这个Story切分为多个Transaction；这个步骤，类似于把一个大的Use Case切分成小的Use Case；

接着，在分析这个小的Use Case的时候，重点关注以下四个方面：

UI/UX，涉及哪些界面；Data management，涉及哪些数据；Intergration，涉及哪些外部组件；Risk，风险的大小；

除此以外，还需要使用Gherkin对每个Transaction进行描述，确保；





