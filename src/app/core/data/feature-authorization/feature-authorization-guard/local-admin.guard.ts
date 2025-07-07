import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { map, Observable, switchMap} from 'rxjs';
import { AuthService } from '../../../auth/auth.service';
import { getFirstSucceededRemoteData, getRemoteDataPayload } from 'src/app/core/shared/operators';
import { returnForbiddenUrlTreeOrLoginOnAllFalse } from 'src/app/core/shared/authorized.operators';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LocalAdminGuard implements CanActivate {
  constructor(protected router: Router, protected authService: AuthService) {
  }

  canActivate(_: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    console.log("can activate -> is local admin");
    return this.authService.getAuthenticatedUserFromStore()
      .pipe(switchMap((user) => {
        console.log("can activate -> user -> " + user.email);
        return user.groups
      }))
      .pipe(getFirstSucceededRemoteData())
      .pipe(getRemoteDataPayload())
      .pipe(map((groups) => {
        console.log("can activate -> groups");
        return groups.page.map((g) => {
        console.log("can activate -> group -> " + g.id);
          return g.id === 'Admins_local';
        });
      }))
      .pipe(returnForbiddenUrlTreeOrLoginOnAllFalse(this.router, this.authService, state.url));
  }
}
