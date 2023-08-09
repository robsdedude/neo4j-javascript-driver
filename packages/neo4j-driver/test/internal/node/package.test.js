/**
 * Copyright (c) "Neo4j"
 * Neo4j Sweden AB [http://neo4j.com]
 *
 * This file is part of Neo4j.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const path = require('path')
const fs = require('fs')
const webpack = require('webpack')
const sharedNeo4j = require('../shared-neo4j').default

describe('Package', function () {
  let driver

  afterAll(async () => {
    if (driver) {
      await driver.close()
    }
  })

  it('should work in NodeJS', function (done) {
    let neo4j

    try {
      neo4j = require(sandboxPath('node_modules', 'neo4j-driver', 'lib'))
    } catch (e) {
      done.fail('Could not load sandbox package', e)
    }

    driver = neo4j.driver(
      `bolt://${sharedNeo4j.hostnameWithBoltPort}`,
      neo4j.auth.basic(sharedNeo4j.username, sharedNeo4j.password)
    )
    const session = driver.session()
    session
      .run('RETURN 1 AS answer')
      .then(function (result) {
        expect(result.records.length).toBe(1)
        expect(result.records[0].get('answer').toNumber()).toBe(1)
      })
      .then(() => session.close())
      .then(() => done())
      .catch(function (e) {
        done.fail(e)
      })
  })

  it('should work with Webpack', function (done) {
    /* eslint-disable no-irregular-whitespace */
    // test project structure:
    // build/sandbox/
    // ├── dist
    // │   └── main.js # created by Webpack during the test
    // ├── node_modules
    // │   └── neo4j-driver -> ../../..
    // ├── package.json
    // └── src
    //     └── index.js
    /* eslint-enable no-irregular-whitespace */

    const projectDir = sandboxPath()
    const srcDir = path.join(projectDir, 'src')
    const distDir = path.join(projectDir, 'dist')
    const indexJsFile = path.join(srcDir, 'index.js')

    // create src directory
    fs.mkdirSync(srcDir)
    // create a single index.js that just requires the driver
    fs.writeFileSync(indexJsFile, 'require("neo4j-driver");\n')

    // configuration for Webpack
    const webpackOptions = {
      mode: 'development',
      context: projectDir,
      output: {
        path: distDir
      }
    }

    // function to invoke when Webpack compiler is done
    const webpackCallback = function (error, stats) {
      if (error) {
        done.fail(error)
      }
      if (stats.hasErrors()) {
        done.fail(stats.toString())
      }
      done()
    }

    // execute Webpack
    webpack(webpackOptions, webpackCallback)
  })
})

function sandboxPath () {
  const parts = [__dirname, '..', '..', '..', 'build', 'sandbox']
  for (let i = 0; i < arguments.length; i++) {
    parts.push(arguments[i])
  }
  return path.join.apply(null, parts)
}
