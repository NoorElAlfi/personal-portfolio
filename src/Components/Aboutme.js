import { Divider, Collapse } from "antd";
import "antd/dist/antd.css";
import Quote from "./Quote";

const { Panel } = Collapse;

const text = `
•English    
•Arabic    
•German
`;

const text2 = `
Born in Canada and moved to Egypt at the age of 4 was raised their and finished all my schooling in Egypt. After highschool I moved back to Canada alone and started my studies
at Queen's University where my love for computers deepened and flourished. I am currently undergoing a 16 Month internship at the Queen's Centre for Advanced Computing which
I am very grateful for and have gained so much real life and computing experience as a result.
`;

function Aboutme() {
  return (
    <div>
      <h1
        style={{
          fontSize: "50px",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {" "}
        Noor El Alfi{" "}
      </h1>
      <h2
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {" "}
        Software Developer{" "}
      </h2>
      <Quote />
      <Divider orientation="left">About Me</Divider>
      <h3
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        Hi I am Noor and I am an Egyptian/Canadian Computer Scientist whom
        aspires to delve deeper and gain more experience in the real world
        computer science field. I have a strong interest and passion for
        Computers and Software development
      </h3>
      <Collapse defaultActiveKey={["0"]}>
        <Panel header="My history" key="1">
          <p>{text2}</p>
        </Panel>
        <Panel header="Languages" key="2">
          <p>{text + "\n"}</p>
        </Panel>
      </Collapse>
    </div>
  );
}

export default Aboutme;
