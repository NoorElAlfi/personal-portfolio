import React, { useState } from "react";
import { Card, Divider } from "antd";

const tabList = [
  {
    key: "tab0",
    tab: "General Info",
  },
  {
    key: "tab1",
    tab: "Experience",
  },
];

const contentList = {
  tab0: (
    <>
      <p>Software Developer Intern</p>
      <p>05/2020 - 09/2021</p>
    </>
  ),
  tab1: (
    <>
      <p>
        IBM Coach(LMS): Question Generation Algorithm & frontend development
      </p>
      <p>
        Nextgene(Genetic variant pipeline): Database webapp & Bioinformatics
        pipeline
      </p>
    </>
  ),
};

const tabList2 = [
  {
    key: "tab2",
    tab: "General Info",
  },
  {
    key: "tab3",
    tab: "Relevant Classes",
  },
];

const contentList2 = {
  tab2: (
    <>
      <p>Kingston, Ontario</p>
      <p>Bachelor of Computing (Hons.)</p>
      <p>09/2017 - 05/2022</p>
    </>
  ),
  tab3: (
    <>
      <p>
        Algorithms, Data Structures, Data analytics, Database management,
        Software architecture, Artificial Intelligence, and Fundamentals of
        Software development
      </p>
    </>
  ),
};

function Experience() {
  const [key, setKey] = useState("tab0");
  const [key2, setKey2] = useState("tab2");

  return (
    <div>
      <Divider orientation="left">Experience</Divider>
      <Card
        style={{ width: "100%" }}
        title="Queen's Centre for Advanced Computing"
        tabList={tabList}
        activeTabKey={key}
        onTabChange={(key) => {
          setKey(key);
        }}
      >
        {contentList[key]}
      </Card>
      <br />
      <Card
        style={{ width: "100%" }}
        title="Queen's University"
        tabList={tabList2}
        activeTabKey={key2}
        onTabChange={(key2) => {
          setKey2(key2);
        }}
      >
        {contentList2[key2]}
      </Card>
    </div>
  );
}

export default Experience;
