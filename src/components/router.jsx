import * as React from "react";
import { Switch, Route, Router } from "wouter";
import Home from "../pages/home";
import About from "../pages/about";

//The router is imported in app.jsx

export default () => (
    <Switch>
      <Route path="/home" component={Home} />
      <Route path="/aboutt" component={About} />
    </Switch>
);
