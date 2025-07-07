import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { map, Observable, switchMap} from 'rxjs';
import { AuthService } from '../../../auth/auth.service';
import { getFirstSucceededRemoteData, getRemoteDataPayload } from 'src/app/core/shared/operators';
import { returnForbiddenUrlTreeOrLoginOnAllFalse } from 'src/app/core/shared/authorized.operators';
import { Injectable } from '@angular/core';
import { followLink } from 'src/app/shared/utils/follow-link-config.model';
import { EPersonDataService } from '../../../eperson/eperson-data.service';

@Injectable({
  providedIn: 'root'
})
export class LocalAdminGuard implements CanActivate {
  constructor(protected router: Router, protected authService: AuthService, protected epersonService: EPersonDataService) {
  }

  canActivate(_: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    return this.authService.getAuthenticatedUserFromStore()
      .pipe(switchMap((user) => this.epersonService.findById(user.id, true, true, followLink('groups'))))
      .pipe(getFirstSucceededRemoteData())
      .pipe(getRemoteDataPayload())
      .pipe(switchMap((user) => user.groups))
      .pipe(getFirstSucceededRemoteData())
      .pipe(getRemoteDataPayload())
      .pipe(map((groups) => {
        return groups.page.map((g) => {
        console.log("can activate -> group -> " + g.name);
          return g.name === 'Admins_local';
        });
      }))
      .pipe(returnForbiddenUrlTreeOrLoginOnAllFalse(this.router, this.authService, state.url));
  }
}
