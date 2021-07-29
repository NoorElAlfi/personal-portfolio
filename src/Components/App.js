import "../App.css";
import { Layout, Menu } from "antd";
import "antd/dist/antd.css";
import Aboutme from "./Aboutme";
import {
  GithubOutlined,
  MailOutlined,
  LinkedinOutlined,
} from "@ant-design/icons";
import logo from "../Img/logo.png";
import Skills from "./Skills";
import Experience from "./Experience";
import Projects from "./Projects";
const { Header, Content, Footer } = Layout;

function App() {
  return (
    <Layout style={{ height: "100%" }}>
      <Header style={{ position: "fixed", zIndex: 1, width: "100%" }}>
        <div className="logo" />
        <Menu theme="dark" mode="horizontal">
          <img src={logo} alt="Noor Logo" width="66" height="52" />
          <Menu.Item key="1" style={{ float: "right" }}>
            <a href="https://www.linkedin.com/in/noor-el-alfi-527a1a20a/">
              <LinkedinOutlined style={{ fontSize: "26px" }} />
            </a>
          </Menu.Item>
          <Menu.Item key="2" style={{ float: "right" }}>
            <a href="mailto:noor.alfi@gmail.com">
              <MailOutlined style={{ fontSize: "26px" }} />
            </a>
          </Menu.Item>
          <Menu.Item key="3" style={{ float: "right" }}>
            <a href="https://github.com/NoorElAlfi">
              <GithubOutlined style={{ fontSize: "26px" }} />
            </a>
          </Menu.Item>
        </Menu>
      </Header>
      <Layout>
        <Content
          className="site-layout"
          style={{ padding: "0 50px", marginTop: 64 }}
        >
          <div
            className="site-layout-background"
            style={{ padding: 24, minHeight: 1650, height: "100vh" }}
          >
            <Aboutme />
            <Skills />
            <Experience />
            <Projects />
          </div>
        </Content>
      </Layout>
      <Footer style={{ textAlign: "center" }}>
        Noor ElAlfi ©2021 Created by Noor ElAlfi
      </Footer>
    </Layout>
  );
}

export default App;
