import { Divider, Space, Card } from "antd";

function Projects() {
  return (
    <div>
      <Divider orientation="left">Projects</Divider>
      <Space direction="horizontal">
        <Card title="Question Generation Algorithm" style={{ height: 250 }}>
          <p>
            A microservice for a learning management system, the algorithm was
            capable of taking in a passage as input and after some preprocessing
            and sentence and key identification the algorithm would output
            questions it was able to generate from the excerpt given. All
            written in Python using a flask backend.
          </p>
        </Card>
        <Card title="Personal Portofolio" style={{ height: 250 }}>
          <p>
            My personal portofolio used to test and exhibit my web development
            abilities. Written in JavaScript using the react library and Antd
            for styling.
          </p>
        </Card>
        <Card title="2X2 Rubiks Cube Solver" style={{ height: 250 }}>
          <p>
            Group Project alongside 5 other peers. Was developed as an Agile
            team. The desktop app was capable of using the webcam to detect the
            sides of the cube using openCV, the app was also able to solve any
            2X2 rubiks cube quite efficiently using a brute force algorithm.
            This project was written in C++ using QT for the GUI and openCV for
            rubiks cube detection.
          </p>
        </Card>
      </Space>
    </div>
  );
}

export default Projects;
