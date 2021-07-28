import { Row, Col, Divider } from "antd";
import "antd/dist/antd.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { fab } from "@fortawesome/free-brands-svg-icons";
import "../Skills.css";
import { library } from "@fortawesome/fontawesome-svg-core";
import c from "../Img/c.png";
import cPlus from "../Img/c++.png";
import haskell from "../Img/haskell.png";
import prolog from "../Img/prol.png";

const style = {
  background: "#0092ff",
  padding: "8px 0",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
};

library.add(fab);

function Skills() {
  return (
    <div>
      <Divider orientation="left">Skills</Divider>
      <Row gutter={[16, 24]}>
        <Col className="gutter-row" span={6}>
          <div style={style}>
            <FontAwesomeIcon icon={["fab", "java"]} size="lg" />
            Java
          </div>
        </Col>
        <Col className="gutter-row" span={6}>
          <div style={style}>
            <FontAwesomeIcon icon={["fab", "python"]} size="lg" />
            Python
          </div>
        </Col>
        <Col className="gutter-row" span={6}>
          <div style={style}>
            <FontAwesomeIcon icon={["fab", "js"]} size="lg" />
            JavaScript
          </div>
        </Col>
        <Col className="gutter-row" span={6}>
          <div style={style}>
            <FontAwesomeIcon icon={["fab", "node"]} size="lg" />
            <FontAwesomeIcon icon={["fab", "react"]} size="lg" />
            Node/React
          </div>
        </Col>
        <Col className="gutter-row" span={6}>
          <div style={style}>
            <FontAwesomeIcon icon={["fab", "docker"]} size="lg" />
            Docker
          </div>
        </Col>
        <Col className="gutter-row" span={6}>
          <div style={style}>
            <FontAwesomeIcon icon={["fab", "linux"]} size="lg" />
            Linux/Bash
          </div>
        </Col>
        <Col className="gutter-row" span={6}>
          <div style={style}>
            <FontAwesomeIcon icon={["fab", "jira"]} size="lg" />
            <FontAwesomeIcon icon={["fab", "slack"]} size="lg" />
            <FontAwesomeIcon icon={["fab", "git"]} size="lg" />
            <FontAwesomeIcon icon={["fab", "github"]} size="lg" />
            Collabaration Software
          </div>
        </Col>
        <Col className="gutter-row" span={6}>
          <div style={style}>
            <FontAwesomeIcon icon={["fab", "r-project"]} size="lg" />R
            Programming Language
          </div>
        </Col>
        <Col className="gutter-row" span={6}>
          <div style={style}>
            <img src={c} alt="c Logo" width="24" height="24" />C Programming
            Language
          </div>
        </Col>
        <Col className="gutter-row" span={6}>
          <div style={style}>
            <img src={cPlus} alt="c++ Logo" width="24" height="24" />
            C++ Programming Language
          </div>
        </Col>
        <Col className="gutter-row" span={6}>
          <div style={style}>
            <img src={haskell} alt="haskell Logo" width="24" height="24" />
            Haskell
          </div>
        </Col>
        <Col className="gutter-row" span={6}>
          <div style={style}>
            <img src={prolog} alt="prolog Logo" width="24" height="24" />
            Prolog
          </div>
        </Col>
      </Row>
    </div>
  );
}

export default Skills;
