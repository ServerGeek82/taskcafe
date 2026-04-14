import React, { useEffect, useState } from 'react';
import { Switch, Route, useHistory, useLocation, Redirect } from 'react-router-dom';
import * as H from 'history';

import Dashboard from 'Dashboard';
import Admin from 'Admin';
import MyTasks from 'MyTasks';
import Confirm from 'Confirm';
import Projects from 'Projects';
import Project from 'Projects/Project';
import Teams from 'Teams';
import Login from 'Auth';
import Register from 'Register';
import Profile from 'Profile';
import styled from 'styled-components';
import { useCurrentUser } from 'App/context';

const MainContent = styled.div`
  padding: 0 0 0 0;
  background: #262c49;
  height: 100%;
  display: flex;
  flex-direction: column;
  flex-grow: 1;
`;

type ValidateTokenResponse = {
  valid: boolean;
  userID: string;
};

const UserRequiredRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useCurrentUser();
  const location = useLocation();
  if (user) {
    return children;
  }
  return (
    <Redirect
      to={{
        pathname: '/login',
        state: { redirect: location.pathname },
      }}
    />
  );
};

const Routes: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const { setUser } = useCurrentUser();
  useEffect(() => {
    fetch('/auth/validate', {
      method: 'POST',
      credentials: 'include',
    })
      .then(async (x) => {
        if (x.ok) {
          const response: ValidateTokenResponse = await x.json();
          const { valid, userID } = response;
          if (valid) {
            setUser(userID);
          }
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);
  if (loading) return null;
  return (
    <Switch>
      <Route exact path="/login" component={Login} />
      <Route exact path="/register" component={Register} />
      <Route exact path="/confirm" component={Confirm} />
      <Route>
        <MainContent>
          <Switch>
            <Route path="/p/:projectID" component={Project} />
            <UserRequiredRoute>
              <Switch>
                <Route exact path="/" component={Projects} />
                <Route path="/teams/:teamID" component={Teams} />
                <Route path="/profile" component={Profile} />
                <Route path="/admin" component={Admin} />
                <Route path="/tasks" component={MyTasks} />
              </Switch>
            </UserRequiredRoute>
          </Switch>
        </MainContent>
      </Route>
    </Switch>
  );
};

export default Routes;
